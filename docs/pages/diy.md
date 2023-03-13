# Table of Contents

1.  [简介](#orgf698d22)
2.  [武将](#orgd5b1988)
    1.  [技能](#org8f605d3)
        1.  [英姿（旧）](#org6a22432)

<a id="orgf698d22"></a>

# 简介

fancy 分支的主要目的之一，是为玩家开放 diy 能力。

当前 diy 的架构仍在设计中，其接口可能会随着版本更迭而变更。但是武将做为 diy 中最核心的部分，其实现已经相对稳定，本手册以一个示例为基础，说明如何向 dsgs 增加一个自己想要的武将。

<a id="orgd5b1988"></a>

# 武将

<a id="org8f605d3"></a>

## 技能

<a id="org6a22432"></a>

### 英姿（旧）

英姿：摸牌阶段，你多摸一张牌

写技能的第一件事，是将技能从文字描述转换为游戏的逻辑结构。

对于一个触发技，我们先按如下规则将其写为一个范式：

1.  触发的条件是什么？
2.  如何判断是否可用？
3.  触发后的效果是什么？

按以上范式分析该技能。

1.  这个技能在摸牌阶段触发。
2.  首先，你需要拥有这个技能；其次，你是因为游戏的摸牌阶段的摸牌规则而摸牌时才能使用这个技能。
3.  触发后，你的摸牌数量应当加 1。

它的实现如下：

    export class YingZiOld extends TriggerSkill {
      // dsgs是事件驱动的，首先判断当前事件是不是一个描牌事件
      // event是当前事件，而stage表示游戏阶段
      // stage表示的概念为某个阶段的开始，进行和结束；
      // 对于摸牌阶段，有<摸牌阶段开始时，摸牌阶段进行时，摸牌阶段结束时>
      // 此处判断了摸牌阶段进行时
      isTriggerable(
        event: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>,
        stage?: AllStage
      ) {
        return stage === DrawCardStage.CardDrawing;
      }

      // room代表玩家所在的房间，owner表示技能的所有者，而content是当前事件
      canUse(
        room: Room,
        owner: Player,
        content: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>
      ) {
        return (
          // 首先判断触发摸牌事件的玩家就是本技能的拥有者，因为英姿技能只对技能拥有者生效
          owner.Id === content.fromId &&
            // 当前玩家正处于游戏阶段中的摸牌阶段<判断阶段，摸牌阶段，出牌阶段，弃牌阶段>
          room.CurrentPlayerPhase === PlayerPhase.DrawCardStage &&
            // 当前玩家因为游戏流程而摸牌，英姿只有玩家因为游戏流程摸牌时，摸牌数才会加1
          content.bySpecialReason === CardDrawReason.GameStage
        );
      }

      // onTrigger可先跳过
      async onTrigger() {
        return true;
      }

      // onEffect是技能效果，它的event固定为ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
      async onEffect(
        room: Room,
        event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
      ) {
        // 这个event有记录它是被哪个event触发的
        // 通过triggeredOnEvent，获取到刚刚触发该技能的摸牌事件
        const drawCardEvent =
          event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DrawCardEvent>;
        // 将摸牌事件中的摸牌数＋1
        drawCardEvent.drawAmount += 1;

        return true;
      }
    }

    export class YingZiOld extends TriggerSkill {
      isTriggerable(
        event: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>,
        stage?: AllStage
      ) {
        return stage === DrawCardStage.CardDrawing;
      }

      canUse(
        room: Room,
        owner: Player,
        content: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>
      ) {
        return (
          owner.Id === content.fromId &&
          room.CurrentPlayerPhase === PlayerPhase.DrawCardStage &&
          content.bySpecialReason === CardDrawReason.GameStage
        );
      }

      async onTrigger() {
        return true;
      }

      async onEffect(
        room: Room,
        event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
      ) {
        const drawCardEvent =
          event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DrawCardEvent>;
        drawCardEvent.drawAmount += 1;

        return true;
      }
    }
