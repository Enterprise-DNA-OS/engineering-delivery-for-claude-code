CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE services (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(code ~ '^[A-Z0-9][A-Z0-9_-]*$'), name text NOT NULL,
 owner text NOT NULL, purpose text NOT NULL DEFAULT '', notice_ref text NOT NULL DEFAULT '',
 retention_review_on date, access_review_on date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(code ~ '^[A-Z0-9][A-Z0-9_-]*$'),
 service_id uuid NOT NULL REFERENCES services(id), title text NOT NULL, author text NOT NULL,
 first_commit_at timestamptz NOT NULL, opened_at timestamptz NOT NULL, merged_at timestamptz,
 additions integer NOT NULL DEFAULT 0 CHECK(additions>=0), deletions integer NOT NULL DEFAULT 0 CHECK(deletions>=0),
 category text NOT NULL DEFAULT 'unclassified' CHECK(category IN ('feature','fix','maintenance','unclassified')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), source_ref text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(opened_at>=first_commit_at), CHECK(merged_at IS NULL OR merged_at>=opened_at)
);
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), change_id uuid NOT NULL REFERENCES changes(id), revision integer NOT NULL,
 reviewer text NOT NULL CHECK(btrim(reviewer)<>''), reviewed_at timestamptz NOT NULL, evidence text NOT NULL CHECK(btrim(evidence)<>''),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(change_id,revision,reviewer)
);
CREATE TABLE deployments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(code ~ '^[A-Z0-9][A-Z0-9_-]*$'),
 service_id uuid NOT NULL REFERENCES services(id), version text NOT NULL, environment text NOT NULL CHECK(environment IN ('production','staging')),
 deployed_at timestamptz NOT NULL, failed_at timestamptz, recovered_at timestamptz,
 is_rework boolean NOT NULL DEFAULT false, reason text NOT NULL DEFAULT '', evidence text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(failed_at IS NULL OR failed_at>=deployed_at), CHECK(recovered_at IS NULL OR (failed_at IS NOT NULL AND recovered_at>=failed_at)),
 CHECK(NOT is_rework OR btrim(reason)<>'')
);
CREATE TABLE deployment_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deployment_id uuid NOT NULL REFERENCES deployments(id), change_id uuid NOT NULL REFERENCES changes(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(deployment_id,change_id)
);
CREATE TABLE actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(code ~ '^[A-Z0-9][A-Z0-9_-]*$'), service_id uuid NOT NULL REFERENCES services(id),
 title text NOT NULL, owner text NOT NULL, due_on date NOT NULL,
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','closed')), evidence text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(state<>'closed' OR btrim(evidence)<>'')
);
CREATE TABLE imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), fingerprint text NOT NULL UNIQUE, file_hash text NOT NULL,
 source text NOT NULL, scope text NOT NULL, mapping jsonb NOT NULL, row_count integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE metric_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL DEFAULT 'linearb', scope text NOT NULL,
 period_start date NOT NULL, period_end date NOT NULL CHECK(period_end>=period_start),
 metric text NOT NULL, unit text NOT NULL, aggregation text NOT NULL,
 value numeric, raw_value text NOT NULL, raw_row jsonb NOT NULL, import_id uuid NOT NULL REFERENCES imports(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source,scope,period_start,period_end,metric,unit,aggregation)
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL REFERENCES services(id), body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity text NOT NULL, record_id uuid NOT NULL, operation text NOT NULL,
 actor text NOT NULL, before_row jsonb, after_row jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION audit_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO audit_log(entity,record_id,operation,actor,before_row,after_row)
 VALUES(TG_TABLE_NAME,COALESCE(NEW.id,OLD.id),TG_OP,COALESCE(NULLIF(current_setting('app.actor',true),''),'database-operator'),
 CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END);
 RETURN COALESCE(NEW,OLD);
END $$;
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['services','changes','reviews','deployments','deployment_changes','actions','imports','metric_snapshots','notes'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',n);
 EXECUTE format('CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_change()',n);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',n);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',n);
 END LOOP;
END $$;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_log FROM PUBLIC;
CREATE VIEW review_queue AS
 SELECT c.code,s.code AS service,c.title,c.author,c.revision,
 round((extract(epoch FROM now()-c.opened_at)/3600)::numeric,1) AS waiting_hours,
 (SELECT count(*) FROM reviews r WHERE r.change_id=c.id AND r.revision=c.revision AND lower(r.reviewer)<>lower(c.author)) AS current_reviews
 FROM changes c JOIN services s ON s.id=c.service_id WHERE c.merged_at IS NULL;
CREATE VIEW release_queue AS
 SELECT c.code,s.code AS service,c.title,c.merged_at,
 round((extract(epoch FROM now()-c.merged_at)/3600)::numeric,1) AS waiting_hours
 FROM changes c JOIN services s ON s.id=c.service_id
 WHERE c.merged_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM deployment_changes dc JOIN deployments d ON d.id=dc.deployment_id WHERE dc.change_id=c.id AND d.environment='production');
CREATE VIEW failure_queue AS
 SELECT d.code,s.code AS service,d.version,d.failed_at,
 round((extract(epoch FROM now()-d.failed_at)/3600)::numeric,1) AS unresolved_hours,d.reason
 FROM deployments d JOIN services s ON s.id=d.service_id WHERE d.environment='production' AND d.failed_at IS NOT NULL AND d.recovered_at IS NULL;
CREATE VIEW action_queue AS
 SELECT a.code,s.code AS service,a.title,a.owner,a.due_on,greatest(0,current_date-a.due_on) AS overdue_days
 FROM actions a JOIN services s ON s.id=a.service_id WHERE a.state='open';
CREATE VIEW delivery_quality AS
 SELECT c.code,s.code AS service,c.title,c.additions+c.deletions AS changed_lines,c.category,c.merged_at,
 (SELECT count(*) FROM reviews r WHERE r.change_id=c.id AND r.revision=c.revision AND lower(r.reviewer)<>lower(c.author)) AS independent_reviews
 FROM changes c JOIN services s ON s.id=c.service_id;
CREATE VIEW service_coverage AS
 SELECT s.code,s.name,s.owner,
 (SELECT count(*) FROM changes c WHERE c.service_id=s.id) AS changes,
 (SELECT count(*) FROM deployments d WHERE d.service_id=s.id AND d.environment='production') AS production_deployments,
 (SELECT max(d.deployed_at) FROM deployments d WHERE d.service_id=s.id AND d.environment='production') AS last_production,
 s.retention_review_on,s.access_review_on FROM services s;
REVOKE ALL ON review_queue,release_queue,failure_queue,action_queue,delivery_quality,service_coverage FROM PUBLIC;
