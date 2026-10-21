# SGS 技术栈升级计划

> 状态：执行中
> 起始日期：2026-10-21
> 目标：Node.js 24/26、现代构建链、MobX 6/7、React 19、Electron 45

## 1. 目标与非目标

### 目标

- 生产环境运行在 Node.js LTS（当前 24.22 Krypton），CI 同时覆盖 Node 24/26。
- 用 Vite 8 替换 CRA 4 + webpack 4，移除 `--openssl-legacy-provider` workaround。
- MobX 5.15 → MobX 6.16（过渡）→ MobX 7.1，保留现有响应式语义。
- React 17 → React 19，Electron 13 → Electron 45。
- 服务端 Express 4 → 5、socket.io 2 → 4。
- 统一依赖管理，减少 5 个 lockfile 带来的版本漂移。

### 非目标

- 不在本次升级中把游戏状态层全量替换为 Zustand。
- 不重写 `src/core` 游戏引擎。
- 不在升级 PR 中引入新玩法或大规模 UI 改版。

## 2. 基线数据

```text
桌面端 TS/TSX：225 个文件，约 48k 行
core：约 111k 行，纯 TS，不使用 MobX
MobX 文件：38 个
MobX 引用：472 处
observer：67 处，其中 class 组件约 31 个
observable.ref：131 处
observable.shallow：17 处
observable.deep：5 处
@mobx.action：156 处
@computed：13 处
runInAction：18 处
broadcastUIUpdate：53 处
测试文件：2 个
```

关键结论：MobX 只在 UI 层；core 不依赖 MobX。UI 层大量使用 class 组件、legacy decorators 和可变 store。

## 3. 版本策略

| 组件 | 当前 | 第一阶段目标 | 最终目标 |
|---|---|---|---|
| Node.js | CI 14.x | 24.22 LTS | 26.x |
| TypeScript | 4.3.5 | 5.x | 5.x/6.x |
| React | 17.0.2 | 17.0.2 | 19.x |
| MobX | 5.15.2 | 6.16.1 | 7.1.0 |
| mobx-react | 6.1.5 | 9.2.0 | 10.0.2 |
| 构建 | CRA4 + webpack 4 | Vite 8 | Vite 8 |
| Electron | 13.1.8 | 13.1.8 | 45.x |
| socket.io | 2.4.1 | 2.4.1 | 4.8.x |
| Express | 4.17 | 4.17 | 5.x |
| ESLint | 8.25 | 8.25 | 10.x flat config |

Node 版本说明：2026-10-21 时最新版为 26.12.0，但尚未标记 LTS；24.22.0 为 Krypton LTS。生产先用 24，CI 覆盖 26。

## 4. 分阶段执行

### Phase 0：版本基线与 CI

- [x] 新增 `.nvmrc`
- [x] 根 `package.json` 增加 `engines`
- [x] CI 改为 Node 24/26 矩阵，升级 actions
- [x] 新增本升级计划
- [ ] 根依赖安装与 lint 基线
- [ ] 记录当前构建失败点

验收：

- `node -v` 与 `.nvmrc` 一致。
- CI 在 Node 24/26 均可执行 install/lint。
- 升级计划进入版本库。

### Phase 1：服务端低风险升级

- [x] `ts-node` 8 → 10（10.9.2）
- [ ] `typescript` 4.3 → 5.x（阻塞：79 个 core 类型错误，拆到 Phase 1b）
- [x] `nodemon` 2 → 3（3.1.10）
- [ ] `@types/node` 18 → 24（阻塞：需要先完成 TS 5 迁移）
- [ ] 移除 `@types/socket.io`、`@types/socket.io-client`
- [ ] Express 4 → 5：`res.sendfile` → `res.sendFile`
- [ ] socket.io 2 → 4：`SocketIO.listen` → `new Server`，CORS 配置改写
- [ ] 服务端 build/start smoke test

验收：

- `cd src/server && yarn build` 通过。
- 服务端可启动，客户端可连接。
- 无 socket.io 协议混跑。

执行结果（2026-10-21）：

```text
src/server yarn install: 通过
src/server yarn build: 通过（TypeScript 4.3.5）
src/server yarn dev: 启动成功，端口 2020
```

TypeScript 5.9 试升级结果：79 个类型错误，集中在 `room.server.ts`（42）、`player.ts`（18）、`game_processor.standard.ts`（11），主要是 TS 4.7+ 条件类型推断变化和 `@types/node` 24 的 Buffer 类型变化。已回退到 TypeScript 4.3.5，Phase 1b 单独处理。

### Phase 1b：TypeScript 5 迁移

- [ ] 先升级到 TypeScript 4.9，逐个修复 79 个类型错误
- [ ] 再升级到 TypeScript 5.x
- [ ] `@types/node` 18 → 24
- [ ] 修复 `shrink_string.ts` 的 Buffer 类型
- [ ] 修复 `system.ts` 重复对象属性
- [ ] 修复 `wuxiekeji.ts` 的 `TimeLimitVariant` 类型
- [ ] 服务端 build/dev 回归

说明：TypeScript 5 的类型错误主要集中在 core，不影响 Node 26 运行，因此不阻塞 Phase 2。

### Phase 2：构建链迁移 Vite 8

- [ ] 新增 `vite.config.ts`
- [ ] 替换 `scripts/start.js`、`scripts/build.js`
- [ ] 配置 `base: './'` 兼容 Electron
- [ ] `vite-tsconfig-paths` 处理 `baseUrl: src`
- [ ] `vite-plugin-svgr` 处理 SVG ReactComponent
- [ ] 迁移 `REACT_APP_*` 环境变量
- [ ] 迁移 `PUBLIC_URL`
- [ ] 移除 `--openssl-legacy-provider`
- [ ] Web build / dev 验证
- [ ] Electron 资源路径验证

验收：

- `yarn build` 在 Node 26 无 MD4 错误。
- Web 页面可加载，静态资源路径正确。
- Electron 可加载构建产物。

### Phase 3：MobX 5 → 6.16

- [x] `mobx` → `^6.16.1`（安装 6.16.1）
- [x] `mobx-react` → `^9.2.0`（安装 9.2.2）
- [x] 为所有 observable class 增加 `makeObservable`（35 个 class，322 个装饰成员）
- [x] 保留 legacy decorators，由装饰器提供注解（MobX 6 不允许装饰器和 annotations map 混用）
- [x] 迁移期 `configure({ enforceActions: 'never' })`
- [ ] async action 改用 `runInAction`
- [ ] 迁移完成后切 `enforceActions: 'observed'`

执行结果（2026-10-21）：

```text
desktop yarn install: 通过（跳过 Electron 二进制下载）
tsc --noEmit: 通过
webpack production build: 通过（仍需 --openssl-legacy-provider）
MobX 装饰器类检查: 35/35 都有 makeObservable
```

说明：

- MobX 6 在 legacy decorators 模式下必须在构造函数调用 `makeObservable(this)`；
  传入 annotations map 会报 `Mixing @decorator syntax with annotations is not supported`。
- 因此本阶段保留 `@mobx.observable.ref` / `@mobx.action` / `@mobx.computed` 装饰器，
  只补 `makeObservable(this)`。
- 新增的 25 个无构造函数 React 组件使用 `constructor(props: any) { super(props); ... }`。
- `src/index.tsx` 增加 `mobx.configure({ enforceActions: 'never' })`，保持 MobX 5 行为。
- Electron 二进制因 `/home/zero/.cache/electron` 权限问题跳过；不影响 Web 构建。

验收：

- 大厅、等待房间、选将、出牌、回放流程无回归。
- 无 MobX 警告（最终阶段）。
- 不把 JSX、函数、`ClientRoom` 误设为 deep observable。

### Phase 4：React 17 → 19

- [ ] `react`/`react-dom` → 19.x
- [ ] `@types/react`/`@types/react-dom` → 19.x
- [ ] `ReactDOM.render` → `createRoot`
- [ ] `react-router-dom` 5 → 7，迁移 Route API
- [ ] 暂不开启 StrictMode
- [ ] 检查生命周期与 socket 订阅清理

验收：

- 所有页面可导航。
- 无 ReactDOM 旧 API。
- 房间事件订阅无重复/泄漏。

### Phase 5：MobX 6 → 7.1

- [ ] `mobx` → `^7.1.0`
- [ ] `mobx-react` → `^10.0.2`
- [ ] 移除 legacy decorators
- [ ] `observable.ref` → `observableRef`
- [ ] `observable.shallow` → `observableShallow`
- [ ] `observable.deep` → `observableDeep`
- [ ] `@observer class` → `observer(Class)` HOC
- [ ] 开启 `enforceActions: 'observed'`

验收：

- 代码中无 legacy decorator。
- MobX 7 + React 19 正常运行。
- 无 observable 代理导致的第三方类实例问题。

### Phase 6：Electron 45

- [ ] `electron` 13 → 45
- [ ] `electron-builder` 22 → 26
- [ ] `electron-store` 升级并处理 ESM
- [ ] 检查 preload / contextIsolation / contextBridge
- [ ] mac/win 构建验证

验收：

- mac/win 安装包可构建、可启动。
- 本地配置读写正常。
- 无 remote / nodeIntegration 旧用法。

### Phase 7：工程化收尾

- [ ] ESLint 8 → 10 flat config
- [ ] Prettier 2 → 3
- [ ] 移除 tslint / prettier-eslint
- [ ] 统一 lockfile / workspace（可选）
- [ ] 补 RoomStore / WaitingRoomStore 单测
- [ ] 更新 README 启动说明

## 5. MobX 迁移约定

- 不使用 `makeAutoObservable` 处理 `RoomStore`：默认 deep 会代理 JSX、函数和游戏类实例。
- `observable.ref` 字段保持引用语义：`JSX.Element`、回调、`ClientRoom`、`Player`、`Card`。
- `observable.shallow` 数组保持浅观察：`displayedCards`、`selectedCards`、`selectedPlayers`、日志数组。
- 生命周期方法不是 action；async 赋值统一用 `runInAction`。
- `room` 目前是 `observable.ref`，嵌套 mutation 依赖 `broadcastUIUpdate()`；迁移时不要误改为 deep。

## 6. 回滚策略

每个 Phase 独立提交/PR：

- Phase 1 只动 `src/server/package.json` 与服务端入口。
- Phase 2 只动构建配置与 scripts。
- Phase 3/5 只动 MobX 注解，不改业务逻辑。
- Phase 4 只动 React/Router。
- Phase 6 只动 Electron 配置。

任一阶段失败可单独 revert，不影响其他阶段。

## 7. 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| webpack 4 MD4 | Node 26 构建失败 | 迁 Vite 8；短期 `--openssl-legacy-provider` |
| socket.io 2/4 协议不兼容 | 客户端无法连接 | 服务端/客户端同时发布 |
| MobX 7 移除 legacy decorators | 编译失败 | 先 MobX 6 过渡，再统一移除 |
| class 组件无法用 hooks | Zustand/React 改造受阻 | 保留 mobx-react class HOC |
| JSX/函数被 deep observable 代理 | 运行时异常 | 显式 `observable.ref` |
| Electron 13 → 45 API 变更 | 桌面端启动失败 | 单独分支，先 smoke preload/Store |
| 测试不足 | 回归难发现 | 补 store 单测 + 手动 smoke 清单 |

## 8. 执行记录

### 2026-10-21

已完成：

- Phase 0：`.nvmrc`、`engines`、CI Node 24/26 矩阵、升级计划。
- Phase 1 部分：`ts-node@10.9.2`、`nodemon@3.1.10`、`@types/express` 升级；服务端 build/dev 通过。
- Phase 3：MobX 5.15.2 → 6.16.1，mobx-react 6.1.5 → 9.2.2；35 个 class 增加 `makeObservable`；Web 构建通过。

验证命令：

```text
Node v26.12.0
yarn lint                         通过
src/server yarn build             通过
src/server yarn dev               启动成功
desktop tsc --noEmit              通过
desktop webpack production build  通过（--openssl-legacy-provider）
```

已知阻塞：

- TypeScript 5.9：79 个 core 类型错误，Phase 1b 处理。
- Vite 迁移未开始；webpack 4 仍依赖 `--openssl-legacy-provider`。
- socket.io 2 / Express 5 未升级。
- Electron 二进制下载受本机缓存目录权限影响，未做桌面端运行验证。
- MobX `enforceActions` 仍为 `never`，未切到 `observed`。

下一步优先级：

1. Phase 2：Vite 8 构建迁移（解除 Node 26 的 MD4 依赖）。
2. Phase 1b：TypeScript 5 类型修复。
3. Phase 4/5：React 19 + MobX 7。

## 9. 手动 Smoke 清单

- 启动服务端与 Web 客户端。
- 创建房间、加入房间、准备、开始游戏。
- 选将、出牌、装备、判定、濒死、技能联动。
- 断线重连、退出房间。
- 回放页面加载。
- Electron 启动、配置读写、窗口关闭。
- mac/win 构建产物安装启动。
