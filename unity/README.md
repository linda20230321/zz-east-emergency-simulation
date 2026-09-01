# Unity KDE热力层接入说明

1. 将 `Runtime/KdeDensityController.cs` 和 `Shaders/KdeHeatmapOverlay.shader` 复制到 Unity 2022 LTS 项目 `Assets/` 下。
2. 新建使用 `ZhengzhouEast/KDEHeatmapOverlay` 的材质，将其赋给覆盖站区地面的透明网格。
3. 在场景对象挂载 `KdeDensityController`，为每个区域设置世界坐标边界、容量和当前Agent Transform列表。
4. 控制器按设定刷新率在CPU端执行高斯核密度估计，生成归一化RFloat纹理；Shader读取纹理并按项目阈值映射颜色。
5. Agent进入/离开区域时必须同步更新区域列表；视频分析、区域统计和热力层均使用同一Agent仓储或快照ID。

正式生产版应将区域边界替换为CAD/BIM坐标，并根据真实视频计数校准带宽、容量和刷新频率。Agent数量较大时，可采用空间哈希降低CPU计算量，或在不改变输入快照和色阶规则的前提下迁移到Compute Shader。
