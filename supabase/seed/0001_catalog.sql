-- Bamilen Archive · category catalogue
insert into public.bamilen_categories (slug, code, name, description, sort_order)
values
  ('corporate', 'CRP', '企业档案', '集团结构、董事会决议与公开资料', 10),
  ('systems', 'SYS', '智能系统', 'Etherial、Proton 架构与 Komos 遗留层', 20),
  ('research', 'RND', '研究记录', '修斯纳、D-17 与生物技术', 30),
  ('security', 'SEC', '安全风控', '审计、事故复盘与访问控制', 40),
  ('facilities', 'FAC', '设施与地理', '勒勒弗斯总部、旧城前哨与中继站', 50),
  ('trade', 'TRD', '交易与合规', 'SPA、索特恩港与对外协议', 60),
  ('personnel', 'PRS', '人员记录', '合作人员、研究员与代表', 70),
  ('sealed', 'SEA', '封存档案', '灯标协议与最高密级记录', 80)
on conflict (slug) do update set
  code = excluded.code,
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;
