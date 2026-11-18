-- CEMP v0.0.0 seed: specializations, tags, code document index, first release
insert into public.specializations (grp, name, slug, sort) values
 ('structural','Structural – Steel & Concrete','structural',1),
 ('construction_mgmt','Construction Management','construction-management',2),
 ('education','Civil Engineering Education','ce-education',3);

insert into public.specializations (grp, parent_id, name, slug, sort)
select v.grp::public.spec_group, p.id, v.name, v.slug, v.sort
from (values
 ('structural','structural','Structural Concrete','concrete',1),
 ('structural','structural','Structural Steel','steel',2),
 ('structural','structural','Welding','welding',3),
 ('structural','structural','Bolting','bolting',4),
 ('construction_mgmt','construction-management','Project Management','project-management',1),
 ('construction_mgmt','construction-management','PERT / CPM','pert-cpm',2),
 ('construction_mgmt','construction-management','Quantity Surveying','quantity-surveying',3),
 ('construction_mgmt','construction-management','Cost Estimation','cost-estimation',4),
 ('construction_mgmt','construction-management','Quality Control & Assurance','qa-qc',5),
 ('construction_mgmt','construction-management','Safety & Health','safety-health',6),
 ('education','ce-education','Philippine CELE','cele',1),
 ('education','ce-education','PH to Global Practice','ph-to-global',2)
) as v(grp, parent_slug, name, slug, sort)
join public.specializations p on p.slug = v.parent_slug;

insert into public.tags (kind, name, slug) values
 ('element','Slab','slab'),('element','Beam','beam'),('element','Girder','girder'),
 ('element','Column','column'),('element','Footing','footing'),('element','Wall','wall'),
 ('element','Stair','stair'),('element','Connection','connection'),('element','Truss','truss'),
 ('activity','Rebar works','rebar'),('activity','Formwork','formwork'),
 ('activity','Concreting','concreting'),('activity','Curing','curing'),
 ('activity','Welding','welding-activity'),('activity','Bolting','bolting-activity'),
 ('activity','Quantity takeoff','takeoff'),('activity','Estimating','estimating'),
 ('activity','Scheduling','scheduling'),('activity','Inspection & testing','inspection'),
 ('activity','Safety','safety'),
 ('phase','Pre-construction','pre-construction'),('phase','Construction','construction'),
 ('phase','Turnover','turnover');

insert into public.code_documents (short_name, title, edition, publisher, year, jurisdiction, status, notes) values
 ('NSCP','National Structural Code of the Philippines, Vol. 1','2015 (7th ed.)','ASEP',2016,'PH','current','Based on ACI 318-14 / AISC 360-10 / ASCE 7-10. Watch for next edition.'),
 ('NBCP','National Building Code of the Philippines (PD 1096) & IRR',null,'DPWH',1977,'PH','current',null),
 ('DPWH Blue Book','DPWH Standard Specifications for Public Works and Highways',null,'DPWH',null,'PH','current','Verify current volume/edition'),
 ('RA 544','Civil Engineering Law',null,'Congress',1950,'PH','current','As amended by RA 1582'),
 ('RA 9514','Fire Code of the Philippines & RIRR',null,'BFP',2008,'PH','current',null),
 ('RA 1378','National Plumbing Code of the Philippines',null,'Congress',1955,'PH','current',null),
 ('PEC','Philippine Electrical Code, Part 1',null,'IIEE',null,'PH','current','Verify edition'),
 ('PD 856','Code on Sanitation of the Philippines',null,'DOH',1975,'PH','current',null),
 ('PD 1067','Water Code of the Philippines',null,'NWRB',1976,'PH','current',null),
 ('BP 344','Accessibility Law',null,'Batasang Pambansa',1983,'PH','current',null),
 ('PD 1586','Environmental Impact Statement System',null,'DENR',1978,'PH','current',null),
 ('RA 9003','Ecological Solid Waste Management Act',null,'Congress',2001,'PH','current',null),
 ('RA 12009','New Government Procurement Act',null,'Congress',2024,'PH','current','Supersedes RA 9184'),
 ('RA 9184','Government Procurement Reform Act',null,'Congress',2003,'PH','superseded','Superseded by RA 12009'),
 ('RA 11058','Occupational Safety and Health Standards Act',null,'Congress',2018,'PH','current',null),
 ('DOLE DO 198','IRR of RA 11058','2018','DOLE',2018,'PH','current',null),
 ('ACI 318','Building Code Requirements for Structural Concrete','318-19','ACI',2019,'US','reference','Verify latest edition'),
 ('AISC 360','Specification for Structural Steel Buildings','360-22','AISC',2022,'US','reference',null),
 ('ASCE 7','Minimum Design Loads and Associated Criteria','7-22','ASCE',2022,'US','reference',null),
 ('AWS D1.1','Structural Welding Code – Steel',null,'AWS',null,'US','reference','Verify edition');

insert into public.releases (version, batch_name, notes_md, released_at) values
 ('v0.0.0','Foundation','- Supabase schema, RLS, invite-only auth\n- Dashboard shell: Codes, Tools, Conversions, Practices, Education\n- Entry viewer with revision + code-edition stamp\n- Publish gate: review + clause refs + hand-check', now());
