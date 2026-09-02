SET search_path TO emergency_sim, public;

INSERT INTO scenario (scenario_code, name, source_script, start_time, end_time, config_version, status)
VALUES (
  'ZZE-FLOOD-2023-0423',
  '因水害影响北京方向列车大面积晚点旅客滞留疏散',
  '因水害影响北京方向列车大面积晚点旅客滞留疏散应急演练脚本4.23.doc',
  '09:00', '09:47', '0.8.1', 'approved'
)
ON CONFLICT (scenario_code) DO UPDATE SET config_version = EXCLUDED.config_version, updated_at = now();

WITH s AS (SELECT id FROM scenario WHERE scenario_code = 'ZZE-FLOOD-2023-0423')
INSERT INTO region (id, scenario_id, name, floor, capacity, boundary, coordinate_system)
SELECT seed.id, s.id, seed.name, seed.floor, seed.capacity, seed.boundary::jsonb, 'normalized_percent_reference_only'
FROM s CROSS JOIN (VALUES
  ('waiting_hall_3f','3F候车大厅',3,35000,'{"xMin":22,"yMin":23,"xMax":80,"yMax":71}'),
  ('perimeter_3f','3F商业及通道',3,12000,'{"xMin":10,"yMin":14,"xMax":88,"yMax":83}'),
  ('gate_zones_3f','3F检票口集结区',3,5000,'{"xMin":23,"yMin":42,"xMax":85,"yMax":65}'),
  ('ticket_service_3f','3F第八售票处',3,3000,'{"xMin":75,"yMin":68,"xMax":88,"yMax":82}'),
  ('platform_2f','2F站台层',2,12000,'{"xMin":12,"yMin":22,"xMax":88,"yMax":80}'),
  ('west_plaza_1f','1F西广场候车区',1,18000,'{"xMin":12,"yMin":28,"xMax":88,"yMax":76}')
) AS seed(id,name,floor,capacity,boundary)
ON CONFLICT (id) DO UPDATE SET capacity = EXCLUDED.capacity, boundary = EXCLUDED.boundary;

WITH s AS (SELECT id FROM scenario WHERE scenario_code = 'ZZE-FLOOD-2023-0423')
INSERT INTO timeline_event (id, scenario_id, offset_seconds, event_time, event_type, name, location, description, source_reference)
SELECT seed.id, s.id, seed.offset_seconds, seed.event_time::time, seed.event_type, seed.name, seed.location, seed.description, seed.source_reference
FROM s CROSS JOIN (VALUES
  ('E0900',0,'09:00','scenario','演练背景','生产指挥中心','加载场景初始条件','脚本9:00'),
  ('E0902',120,'09:02','command','启动一级响应','生产指挥中心','下达I级应急响应命令','脚本9:02'),
  ('E0905',300,'09:05','device','岗位到位与限流','全站','闸机与换乘直梯联动','脚本9:05'),
  ('E0912',720,'09:12','staff','客运车间响应','生产指挥中心','客运岗位完成部署','脚本9:12'),
  ('E0913',780,'09:13','data','综控计划处置','综控计划室','核对晚点停运与接续数据','脚本9:13'),
  ('E0917',1020,'09:17','broadcast','晚点广播','32B检票口','自动播报停运和候车信息','脚本9:17'),
  ('E0919',1140,'09:19','display','停运信息发布','服务台/南北进站口','大屏同步发布停运公告','脚本9:19'),
  ('E0921',1260,'09:21','evacuation','大规模疏散启动','3F候车厅→1F西广场','主疏散路径激活','脚本9:21'),
  ('E0923',1380,'09:23','organization','候车分区组织','B8-B9后方','临时候车区启用','脚本9:23'),
  ('E0926',1560,'09:26','ticket','增开退改签窗口','第八售票处','50/51号窗口增开','脚本9:26'),
  ('E0929',1740,'09:29','transfer','高普联动','B4-B5/西南落客平台','旅客转乘大巴接续普速列车','脚本9:29'),
  ('E0932',1920,'09:32','control','西南口只出不进','西南进站口','扶梯节点限流','脚本9:32'),
  ('E0935',2100,'09:35','return','西广场候车与回流','1F西广场','绿色通道分批回流','脚本9:35'),
  ('E0946',2760,'09:46','report','疏散基本完成','全站','候车厅约2万人','脚本9:46'),
  ('E0947',2820,'09:47','finish','响应结束','生产指挥中心','恢复常规状态','脚本9:47')
) AS seed(id,offset_seconds,event_time,event_type,name,location,description,source_reference)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, source_reference = EXCLUDED.source_reference;
