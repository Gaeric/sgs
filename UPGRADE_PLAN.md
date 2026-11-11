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
- [x] 根依赖安装与 lint 基线（2026-11-11 复验通过）
- [x] 记录当前构建失败点（见执行记录）

验收：

- `node -v` 与 `.nvmrc` 一致。
- CI 在 Node 24/26 均可执行 install/lint。
- 升级计划进入版本库。

### Phase 1：服务端低风险升级

- [x] `ts-node` 8 → 10（10.9.2）
- [x] `typescript` 4.3 → 5.9.3（Phase 1b，2026-11-11）
- [x] `nodemon` 2 → 3（3.1.10）
- [x] `@types/node` 18 → 24.19.2（Phase 1b）
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

- [x] 用 TypeScript 4.9.5 试编译并修复类型错误（本次复现 54 个，修复后 0 个）
- [x] 根目录、服务端、desktop 统一升级到 TypeScript 5.9.3
- [x] 根目录、服务端、desktop 的 `@types/node` → 24.19.2
- [x] 修复 `shrink_string.ts` 的 Buffer 类型推断并移除多余复制
- [x] 修复 `system.ts` / `stage_processor.ts` 重复对象属性
- [x] 修复 `wuxiekeji.ts` 的 `TimeLimitVariant` 类型
- [x] 服务端 build/dev 回归（编译后入口与 ts-node 入口均通过 socket 连接/大厅 ping）
- [x] desktop 类型检查、Vite 构建与无 GUI 自动化测试

说明：代码和无 GUI 回归已完成；游戏交互与 Electron 人工验收仍待执行。

### Phase 2：构建链迁移 Vite 8

- [x] 新增 `vite.config.mts`
- [x] 新增 `start:vite`、`build:vite`、`preview:vite`
- [x] `transpile:client` 切换到 Vite
- [x] 配置 `base: './'`
- [x] 使用 Vite 8 原生 `resolve.tsconfigPaths`（移除 `vite-tsconfig-paths`）
- [x] 迁移 `REACT_APP_DEV_MODE`、`PUBLIC_URL`、`NODE_ENV`
- [x] Web 构建移除 `--openssl-legacy-provider`
- [x] Web build / dev / preview 验证
- [ ] Electron 仍保留 CRA 构建，后续单独迁移
- [ ] `vite-plugin-svgr` 暂不需要（项目没有 SVG ReactComponent 用法）

验收：

- `yarn build:vite` 在 Node 26 无 MD4 错误。
- Web 页面可加载，静态资源路径正确。
- Electron 当前仍用 CRA 构建，未迁移到 Vite。

执行结果（2026-10-21）：

```text
yarn build:vite: 通过（约 2s）
yarn start:vite: 启动成功，http://localhost:3000/
yarn preview:vite: 启动成功，http://localhost:4173/
yarn build:mac（CRA 回退）: 通过
```

迁移中处理的问题：

- Vite 8 / Oxc 不会像 TypeScript 一样自动 elide 跨模块 type-only imports，
  导致 Rolldown 报 `MISSING_EXPORT`。已把相关 import 改为 `import type`：
  - `waiting_room.tsx`
  - `waiting_room.store.ts`
  - `waiting_room.presenter.ts`
  - `room.tsx`
  - `room.presenter.tsx`
  - `replay_room.tsx`
- `public/index.html` 改为根目录 `index.cra.html`，继续供 CRA 使用；
  Vite 使用根目录 `index.html`，避免 public 目录覆盖构建产物。
- `dev_image_loader.ts` 移除了对外部 COS URL 的动态 `import()`，直接返回 URL 字符串。
- 仍有 chunk size 和 `INEFFECTIVE_DYNAMIC_IMPORT` 警告，不影响构建。

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

- [x] Phase 4a：`react`/`react-dom` 17 → 18.3.1（独立过渡检查点）
- [x] Phase 4a：React/DOM/test-renderer 类型与 React 18 对齐
- [x] Phase 4a：App 测试改为真实 DOM `createRoot`，新增动画根生命周期测试
- [x] `react`/`react-dom` → 19.3.1（Phase 4b）
- [x] `@types/react`/`@types/react-dom` → 19.3.0（Phase 4b）
- [x] `ReactDOM.render` / `unmountComponentAtNode` → `createRoot` / `root.unmount`（入口与动画）
- [x] `react-router-dom` 5 → 7.18.5，迁移 Route API（Phase 4c）
- [x] 暂不开启 StrictMode（React 19 迁移保持关闭）
- [x] 路由生命周期检查：参数变化重建房间实例、修复 beforeunload listener 泄漏并补测试
- [ ] 全流程 socket / 异步任务清理审计（仍有旧代码待独立处理）

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
- Phase 2：Vite 8 构建链接入；Web build/dev/preview 通过；CRA 保留给 Electron。
- Phase 3：MobX 5.15.2 → 6.16.1，mobx-react 6.1.5 → 9.2.2；35 个 class 增加 `makeObservable`；Web 构建通过。

验证命令：

```text
Node v26.12.0
yarn lint                         通过
src/server yarn build             通过
src/server yarn dev               启动成功
desktop tsc --noEmit              通过
desktop yarn build:vite           通过
desktop yarn start:vite           启动成功
desktop yarn preview:vite         启动成功
desktop yarn build:mac            CRA 回退通过
```

已知阻塞：

- TypeScript 5.9：79 个 core 类型错误，Phase 1b 处理。
- Electron 仍走 CRA/webpack 4，因此 Electron 构建仍依赖 `--openssl-legacy-provider`。
- Vite 产物使用 ES module，Electron `file://` 加载需要单独验证；当前不切换 Electron 构建。
- socket.io 2 / Express 5 未升级。
- Electron 二进制下载受本机缓存目录权限影响，未做桌面端运行验证。
- MobX `enforceActions` 仍为 `never`，未切到 `observed`。

下一步优先级：

1. Phase 1b：TypeScript 5 类型修复。
2. Phase 4/5：React 19 + MobX 7。
3. Phase 6：Electron 45 + Vite/本地服务加载方案。
4. Phase 7：ESLint 10、lockfile/workspace 收尾。

### 2026-11-11：容器内无 GUI 基线验证

当前环境无法进行人工 UI 操作。可以继续代码迁移，但将自动化检查与人工验收分开记录；构建通过不代表交互行为通过。

环境：Node v26.12.0、Yarn 1.22.22；尚未在本次验证中覆盖 `.nvmrc` 指定的 Node 24.22.0。

| 检查 | 结果 |
|---|---|
| 根目录 `yarn lint` | 通过 |
| `src/server`：`yarn build` | 通过（TypeScript 4.3.5） |
| desktop：`yarn build:vite` | 通过；仍有 chunk size / ineffective dynamic import 警告 |
| desktop：`yarn tsc --noEmit` | 通过（TypeScript 4.3.5） |
| 编译后服务端启动 + Engine.IO v3 polling handshake | 通过；端口 2020 返回包含 session ID 的握手响应，检查后服务进程已停止 |
| desktop：`CI=true yarn test --watchAll=false --runInBand` | 失败于测试初始化；`src/setupTests.ts` 引用的 `@testing-library/jest-dom/extend-expect` 无法解析，尚未执行测试用例 |
| UI 导航、游戏交互、回放、Electron 启动 | 未验证；留待有 UI 环境时验收 |

执行约束：

- desktop 的 `build:vite` 会调用 `sync:mac` 删除并复制 `src/core`；不能同时运行前端 type-check 或其他读取此目录的检查。本次并行执行曾产生临时 missing-file 错误，构建完成后重新 type-check 已通过。
- 迁移继续采用独立步骤：先修复自动化测试基线，再开展 Phase 1b TypeScript 升级。
- 不因缺少 GUI 跳过类型检查，不以 Vite 构建替代类型检查，也不把未进行的人工验收标为通过。

### 2026-11-11：测试基线修复与 Phase 1b 完成

依赖变更：

- 根目录、服务端、desktop 使用 `typescript@5.9.3`、`@types/node@24.19.2`；更新各自 lockfile。
- 根目录 `ts-node` 升到 10.9.2，与服务端保持一致。
- desktop 显式声明 React 17 类型，测试 renderer / renderer 类型对齐 React 17；React 运行时未升级。

修复内容：

- `Room.trigger` / `ServerRoom.trigger` 使用一致的受约束事件泛型，替换不兼容的条件类型。
- Player 技能查询保留原泛型调用接口，以 overload 分离返回类型和实现；不改过滤逻辑。
- 删除两处内容相同的重复对象属性；数字/二元数组先做类型缩窄再比较。
- `wuxiekeji` 通知使用命名 enum，保留原 1500ms 等待。
- timer handle 改用 `ReturnType<typeof setTimeout>`；压缩方法直接使用 zlib 返回的 Buffer，避免重复复制。
- 移除未使用且缺失的 jest-dom 初始化导入，配置 Jest `src` 模块路径。
- App 测试验证实际开场页/router 的渲染、跳转与 cleanup；无关页面和网络/媒体服务使用 mock。
- 新增 WaitingRoomStore 的 deep / shallow / ref 响应性测试，以及压缩兼容性/损坏输入测试。
- CI 新增顺序执行的 frontend type-check 与 headless test，跳过不需要的 Electron 二进制下载。

验证（本容器 Node 26.12.0）：

- `yarn lint`、服务端 `yarn build`、desktop `yarn build:vite` / `yarn tsc --noEmit` 通过。
- desktop `CI=true yarn test --watchAll=false --runInBand`：3 suites / 16 tests 通过，无快照自动生成。
- 编译后服务端与 ts-node 开发入口均启动成功；真实 Socket.IO 2 客户端连接 `/lobby` 并收到 PingServer 响应；检查后进程已清理。
- gzip/base64 空串、ASCII、Unicode、大字符串 round trip 通过。
- 仍有 Vite chunk size / ineffective dynamic import、旧 CRA 依赖 peer warning；未在本轮处理。
- `.nvmrc` 对应 Node 24 的运行验证尚未执行；由 CI 矩阵进一步覆盖。
- 根 `tsconfig.json` 现有范围包含独立 desktop 工程，根 `yarn tsc --noEmit` 试验存在跨工程路径/类型冲突；本轮验收使用各工程自己的配置，根构建范围留待工程化收尾。
- UI / 完整游戏流程 / Electron 未做人工验证；不以 headless 测试替代此验收。

下一步：先审查并提交本阶段变更，再独立开展 React/Router 迁移；MobX 7 与 Electron 升级不混入本阶段。

### 2026-11-11：Phase 4a React 18 检查点

变更：

- desktop `react` / `react-dom` / `react-test-renderer` 固定到 18.3.1，更新对应类型和 lockfile；React 19 尚未升级。
- React Router 运行时仍为原 5.x；仅更新 Router 5 类型定义，并用 desktop resolutions 统一 `@types/react@18.3.31` 与 `@types/react-router@5.1.20`，避免旧的嵌套类型导致 JSX / children 冲突。
- `src/index.tsx` 使用 `createRoot`，缺少 `#root` 时明确报错；未开启 StrictMode。
- `MoveInstantCardAnimation` 每个临时容器创建一个 root，后续帧复用，结束时先 unmount 再删除容器；异常路径也清理。仅首帧使用 `flushSync`，确保初始位置在 timer 前提交，避免并发渲染跳过 CSS 起始帧。
- 隐藏卡牌采用稳定的 offset key，消除新增测试发现的列表 key 警告。
- App 测试从 react-test-renderer 改为 jsdom 上的真实 DOM root，验证开场渲染、点击/键盘/超时跳转、props 传递和卸载清理。
- 新增 6 个动画测试，覆盖真实 root 复用、帧样式与顺序、unmount 清理、异常清理和跳过条件；全套现在是 4 suites / 22 tests。
- MobX 6、Router 5 运行时、Electron 和服务端协议均未升级。

验证（本容器 Node 26.12.0）：

- desktop `yarn build:vite`、`yarn tsc --noEmit`、`CI=true yarn test --watchAll=false --runInBand` 通过。
- 根 `yarn lint`、服务端 `yarn build` 通过。
- 编译后服务端启动与 Socket.IO 2 `/lobby` ping 通过；进程已停止。
- 源码中不再使用 `ReactDOM.render` / `unmountComponentAtNode`；测试不再导入 react-test-renderer（匹配的依赖暂保留）。
- 仍有既有 Vite chunk/import 警告和旧 CRA / Router peer dependency 警告。实际视觉动画、完整游戏、Electron、Node 24 运行验证仍待完成。

下一步：审查/提交此 React 18 检查点后，再独立推进 React 19 与 Router API 迁移。

### 2026-11-11：Phase 4b React 19 检查点

变更：

- 从 npm registry 确认稳定版后，将 desktop `react` / `react-dom` 固定到 19.3.1；类型更新到 19.3.0，统一 React 类型 resolution 并更新 lockfile。
- 移除未使用的 `react-test-renderer` 与 `@types/react-test-renderer`，所有组件测试使用真实 DOM roots。
- 旧全局 `JSX.Element` 改为显式 `React.ReactElement`，覆盖 desktop 与共享的 client translation 模块；不添加全局 JSX 兼容 shim。
- desktop TypeScript `jsx` 改为 `react-jsx`，使用 React 19 所需的现代自动 JSX transform；Vite / Jest 已有对应配置。
- 新增 4 个真实 DOM MobX class observer 集成测试，验证 legacy decorators + PureComponent 的 action/props 更新、ref store 替换、shallow 数组行为，以及 unmount 释放订阅。
- MobX 仍为 6.16.1、mobx-react 仍为 9.2.2（其 peer range 支持 React 19），Router 运行时仍为 5.1.2；StrictMode 保持关闭。未进行 Router API、Electron 或服务端协议升级。

验证（本容器 Node 26.12.0）：

- desktop `yarn install --frozen-lockfile`、`yarn build:vite`、`yarn tsc --noEmit` 通过。
- `CI=true yarn test --watchAll=false --runInBand`：5 suites / 26 tests 全部通过，测试输出无 React 警告。
- 根 `yarn lint`、服务端 `yarn build` 通过。
- 编译后服务端启动、Engine.IO v3 handshake 与真实 Socket.IO 2 `/lobby` ping 通过，进程已清理。
- 仍有既有 Vite chunk/import 警告和旧 CRA / Router peer dependency 警告；Router 的未覆盖流程不能仅靠开场页测试认定完全兼容。
- 完整游戏交互、视觉动画、Electron 运行与 Node 24 验证仍待执行；Phase 4 的 Router/全流程验收项未完成。

下一步：审查并提交 React 19 检查点，再独立迁移 Router 5 API，扩展路由与房间订阅清理测试。MobX 7 与 Electron 升级不混入本阶段。

### 2026-11-11：Phase 4c Router 7 检查点

变更：

- desktop `react-router-dom` 固定到 7.18.5，移除 Router 5 的 `@types/react-router` / `@types/react-router-dom` 和对应 resolution；使用包内置类型并更新 lockfile。
- 保留入口唯一的 `MemoryRouter`，App 移除自己的 history/Router，改用 `Routes` / `Route element` / `Navigate`。不改为 BrowserRouter，保留桌面与内存路由模型。
- 新增 hook-to-class `PageRoute` adapter，向原有 class 页面传递 `navigate` / `location` / `params`；移除 legacy history/match API。所有 push state 改为 `{ state: ... }`，字段与对象引用保持不变。
- routing provider 的 `getCurrentLocation()` 让 outgoing lifecycle 读取目标位置，保留 lobby → characters 不停止 BGM 的逻辑；支持 back/forward。
- 房间/回放的路径或 history entry 变化时 remount，避免旧构造函数继续绑定前一个 room socket。
- 新增边界 guard：无效 room id、缺少 host/mode 或 replay 基本结构时 replace 到 lobby，不进入依赖 state 的页面构造函数。campaign 不强制网络 host；waiting-room 保留可缺 ping/roomInfo 的旧入口。guard 不替代完整 replay 内容校验。
- Banner 改用 `useNavigate`；房间的 beforeunload listener 改为稳定函数并在卸载时移除。保留原 online/observer leave 通知与 campaign disconnect 行为，不更改 socket 协议或关闭策略。
- Jest 26 不支持 Router 7 的 exports-only `react-router/dom` 子路径，测试映射到已安装包的 CJS dom 入口；jsdom 缺少 TextEncoder/TextDecoder，在 test setup 使用 Node util 补齐。未全量升级 Jest。

验证（本容器 Node 26.12.0）：

- desktop frozen-lockfile install、Vite build、TypeScript check、根 lint、服务端 build 全部通过。
- 全套 headless tests：6 suites / 69 tests 通过。App 路由测试覆盖真实开场页、state 引用传递、online/observer/campaign、roomId 参数、回放、无效入口、replace 和 back/forward。
- 实际 RoomPage 构造与生命周期测试使用 mock engine/transport/services：覆盖三次 mount/unmount、beforeunload 精确注册/移除、离房通知、observer/campaign 模式、返回 waiting-room state 和拒绝加入后的导航；不等同真实联机对局。
- 编译后服务端启动与真实 Socket.IO 2 lobby ping 通过，检查后进程已清理。
- 不再有业务源码 Router 5 imports / history.push / useHistory / match.params；保留 React 19、MobX 6、Electron、服务器协议版本。
- Vite chunk/import、旧 CRA peer dependency 与 css-loader 重复声明 warning 仍在；Node 24、人工 UI/游戏/回放/Electron 验收仍待执行。
- 旧 online socket 关闭/事件解绑及 async 回调取消仍需独立审计；本阶段没有宣称全流程无订阅泄漏。

下一步：审查并提交 Router 检查点，再按计划推进 MobX 迁移或先补房间连接清理回归；不要将 Electron 升级混入同一个变更。

## 9. 手动 Smoke 清单

- 启动服务端与 Web 客户端。
- 创建房间、加入房间、准备、开始游戏。
- 选将、出牌、装备、判定、濒死、技能联动。
- 断线重连、退出房间。
- 回放页面加载。
- Electron 启动、配置读写、窗口关闭。
- mac/win 构建产物安装启动。

### 2026-11-11：连接与异步任务生命周期清理

- ClientSocket 移除额外的无用 Manager，仅创建一个 namespace socket；精确解绑自身 listener，disconnect 幂等且不关闭共享的 sibling namespace。
- RoomPage 离开时先发送原 PlayerLeave 通知（campaign 保留本地断开行为），再断开自己的 socket、dispose processor/animations、停止音频；beforeunload 与 unmount 共用幂等清理。迟到的事件、重连、导航回调和 await 后页面更新被阻止。
- GameClientProcessor dispose 清理 trusted timer，阻止过期响应与 await 后继续广播/更新；Replay 取消自己的 step timer 并 resolve 等待，停止嵌套 bulk 与过期事件后续更新。
- 动画 dispose 清理 timer、React roots 与临时 DOM，并使取消的等待正常结束。
- WaitingRoom processor/sender 精确解绑自身 listener，等待头像期间离开不再继续处理；页面按 leave → dispose → disconnect 顺序清理。
- Lobby 不关闭共享服务，仅忽略过期回调；room list 查询 generation 防止旧刷新响应覆盖新结果。
- 无依赖/协议升级。真实 Socket.IO 2 测试覆盖 polling/WebSocket leave 后断开与 sibling namespace 存活；不保证断网或进程退出时 leave 必达。
- 验证：Vite build、desktop type-check、服务端 build、根 lint 通过；12 suites / 154 tests 通过。
- 限制：mock-based 页面测试不替代完整联机/UI验收；不能撤销已开始的 core 操作或取消所有 action selection promise；共享 Electron updater 的旧 callback 以 guard 阻止副作用，未新增取消 API。Node 24/桌面端人工验证仍待进行。
