DO $$ BEGIN
IF EXISTS(SELECT 1 FROM services WHERE code='PORTAL') THEN RETURN; END IF;
PERFORM set_config('app.actor','fictional-demo',true);
INSERT INTO services(id,code,name,owner,purpose,notice_ref,retention_review_on,access_review_on) VALUES
('10000000-0000-0000-0000-000000000001','PORTAL','Customer portal','Mara','Improve team delivery flow','policy://team-notice',current_date+60,current_date+30),
('10000000-0000-0000-0000-000000000002','BILLING','Billing service','Ravi','','',current_date-3,current_date-7),
('10000000-0000-0000-0000-000000000003','ARCHIVE','Archive service','Jules','Review service delivery','policy://team-notice',current_date+90,current_date+30)
ON CONFLICT DO NOTHING;
INSERT INTO changes(id,code,service_id,title,author,first_commit_at,opened_at,merged_at,additions,deletions,category) VALUES
('20000000-0000-0000-0000-000000000001','PR-101','10000000-0000-0000-0000-000000000001','Account search filters','Alex',now()-interval '10 days',now()-interval '8 days',NULL,620,90,'feature'),
('20000000-0000-0000-0000-000000000002','PR-102','10000000-0000-0000-0000-000000000001','Fix pagination cursor','Jo',now()-interval '7 days',now()-interval '6 days',now()-interval '5 days',80,30,'fix'),
('20000000-0000-0000-0000-000000000003','PR-103','10000000-0000-0000-0000-000000000001','Renew session cookie','Alex',now()-interval '6 days',now()-interval '5 days',now()-interval '4 days',60,20,'fix'),
('20000000-0000-0000-0000-000000000004','PR-201','10000000-0000-0000-0000-000000000002','Invoice reconciliation','Lee',now()-interval '12 days',now()-interval '10 days',now()-interval '8 days',300,50,'unclassified'),
('20000000-0000-0000-0000-000000000005','PR-202','10000000-0000-0000-0000-000000000002','Rounding correction','Toni',now()-interval '5 days',now()-interval '4 days',now()-interval '3 days',22,12,'fix'),
('20000000-0000-0000-0000-000000000006','PR-203','10000000-0000-0000-0000-000000000002','Batch validation','Lee',now()-interval '3 days',now()-interval '2 days',NULL,100,30,'maintenance')
ON CONFLICT DO NOTHING;
INSERT INTO reviews(change_id,revision,reviewer,reviewed_at,evidence) SELECT id,revision,'Mara',opened_at+interval '4 hours','demo://review/'||code FROM changes WHERE code IN ('PR-102','PR-103','PR-202') ON CONFLICT DO NOTHING;
INSERT INTO reviews(change_id,revision,reviewer,reviewed_at,evidence) SELECT id,1,'Ravi',opened_at+interval '2 hours','demo://earlier-revision' FROM changes WHERE code='PR-203' ON CONFLICT DO NOTHING;
UPDATE changes SET revision=2 WHERE code='PR-203' AND revision=1;
INSERT INTO deployments(id,code,service_id,version,environment,deployed_at,failed_at,recovered_at,is_rework,reason,evidence) VALUES
('30000000-0000-0000-0000-000000000001','REL-101','10000000-0000-0000-0000-000000000001','1.4.0','production',now()-interval '4 days',now()-interval '4 days'+interval '1 hour',now()-interval '4 days'+interval '3 hours',false,'Pagination error','demo://incident/1'),
('30000000-0000-0000-0000-000000000002','REL-102','10000000-0000-0000-0000-000000000001','1.4.1','production',now()-interval '3 days',NULL,NULL,true,'Unplanned fix for pagination error','demo://release/2'),
('30000000-0000-0000-0000-000000000003','REL-201','10000000-0000-0000-0000-000000000002','2.1.0','production',now()-interval '7 days',now()-interval '7 days'+interval '1 hour',NULL,false,'Reconciliation job failure','demo://incident/2'),
('30000000-0000-0000-0000-000000000004','STAGE-1','10000000-0000-0000-0000-000000000002','2.1.1-rc','staging',now()-interval '2 days',NULL,NULL,false,'','demo://staging')
ON CONFLICT DO NOTHING;
INSERT INTO deployment_changes(deployment_id,change_id) VALUES
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003'),
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000004'),
('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000005') ON CONFLICT DO NOTHING;
INSERT INTO actions(code,service_id,title,owner,due_on) VALUES
('ACT-1','10000000-0000-0000-0000-000000000001','Split oversized review into smaller changes','Alex',current_date-2),
('ACT-2','10000000-0000-0000-0000-000000000002','Verify reconciliation recovery','Ravi',current_date-1),
('ACT-3','10000000-0000-0000-0000-000000000002','Agree retention review','Mara',current_date+3) ON CONFLICT DO NOTHING;

END $$;
