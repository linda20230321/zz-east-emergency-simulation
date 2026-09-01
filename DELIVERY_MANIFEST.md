# 郑州东站应急疏散高保真仿真系统交付清单

交付版本：0.8.0
发布日期：2026-09-01
场景编号：ZZE-FLOOD-2023-0423

## 1. 交付范围

- `app/`、`components/`、`lib/`：Web前端源码、仿真逻辑和交互逻辑；
- `data/`：时间线、设备、客流、区域、路径、密度和监控配置；
- `public/assets/`：郑州东站高清三层底图及界面资源；
- `database/`：PostgreSQL/TimescaleDB建表与基线种子脚本；
- `unity/`：CPU KDE控制器、热力Shader及Unity接入说明；
- `docs/`：需求、架构、算法、部署、操作、测试、版本、研究计划、脚本映射及追溯矩阵；
- `tests/`、`scripts/`：自动化测试、构建和版本同步门禁；
- `package.json`、`package-lock.json`、`.openai/hosting.json`：依赖锁定和部署配置。

## 2. 本地运行

安装Node.js 22.13或更高版本，在工程根目录执行：

```bash
npm ci
npm test
npm run dev
```

终端显示访问地址后，用浏览器打开。生产方式：

```bash
npm ci
npm run build
npm start
```

## 3. Render部署

将本交付包解压后上传到GitHub仓库根目录，在Render创建Node Web Service：

- Build Command：`npm ci && npm run build`
- Start Command：`npm start`
- Node版本：22.13.0或更高
- 环境变量：当前原型无需配置

完整步骤见`docs/04_部署与运维手册.md`。

## 4. 验证

发布前执行`npm test`。该命令会校验版本与文档同步、生产构建、15个时间节点、37,000人守恒、精简设备范围、四出口动态路线切换、改进型A*、六路监控同源、人员范围、楼层人数和站台乘车联动。

当前演示地址：https://zz-east-emergency-sim.jy0727520.chatgpt.site

## 5. 未包含内容

为保证安全和体积，本压缩包不包含`.git`、`node_modules`、构建缓存、私密环境变量和真实监控视频。依赖由`npm ci`按锁文件自动安装；真实视频流、CAD/BIM坐标和生产设备接口仍需由项目现场提供。
