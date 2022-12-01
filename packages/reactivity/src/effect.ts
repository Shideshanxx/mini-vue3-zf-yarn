import { isArray, isIntegerKey } from "@vue/shared";
import { TriggerOrTypes } from "./operators";
export function effect(fn, options: any = {}) {
  const effect = createReactiveEffect(fn, options);
  if (!options.lazy) {
    effect(); // 响应式的effect会默认先执行一次
  }

  return effect;
}
let uid = 0;
let activeEffect; // 存储当前的effect
const effectStack = []; // effect 函数内部可能嵌套另一个 effect，所以使用栈来存储 effect
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    // 保证栈中的effect具有唯一性
    if (!effectStack.includes(effect)) {
      try {
        effectStack.push(effect);
        activeEffect = effect;
        return fn(); // 执行fn时，会取值，执行响应式数据的 get 方法
      } finally {
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  };
  effect.id = uid++; // 制作一个effect标识，用于区分effect
  effect._isEffect = true; // 用于标识这是个响应式的effect
  effect.raw = fn; // 保留effect对应的原函数
  effect.options = options; // 在effect上保存用户的属性
  return effect;
}
/**
 * 让某个对象中的属性【收集】当前它对应的effect函数
 * 一个属性可能对应多个effect，一个effect也可能对应多个属性
 */
const targetMap = new WeakMap();
export function track(target, type, key) {
  if (activeEffect === undefined) {
    return;
  }
  //   收集依赖的结构：
  //   targetMap(WeakMap): {
  //     target1(Map): {
  //         key1(Set): [effect1, effect2]
  //     },
  //     target2(Map): {}
  //   }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
  }
}

// 找属性对应的 effect 让其执行（数组、对象）
export function trigger(target, type, key?, newValue?, oldValue?) {
  console.log(target, type, key, newValue, oldValue);
  // 如果这个属性没有收集过effect，那不需要做任何操作
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  // 我要将所有要执行的 effect 全部存到一个新的集合中，最终一起执行
  const effects = new Set(); // 使用Set结构对effect去重
  const add = (dep) => {
    if (dep) {
      dep.forEach((effect) => effects.add(effect));
    }
  };

  // 1. 如果修改的是数组的length属性
  if (key === "length" && isArray(target)) {
    depsMap.forEach((dep, key) => {
      // 数组 length 属性对应的effect需要重新执行
      // 如果更改的长度小于收集的索引，那么这个索引收集的effect也需要重新执行
      if (key === "length" || key >= newValue) {
        add(dep);
      }
    });
  } else {
    // 2. 如果是对象
    if (key !== undefined) {
      // 这里一定是修改属性
      // 新增属性不会触发它的effect重新执行（如果是新增的属性，下方的get方法返回undefined），因为新增的属性之前没有出现在effect的fn中，该属性没有收集过effect
      add(depsMap.get(key));
    }
    // 3. 如果修改数组中的某一个索引对应的元素
    switch (type) {
      // 如果通过索引增加了数组长度就触发长度的更新
      case TriggerOrTypes.ADD:
        if (isArray(target) && isIntegerKey(key)) {
          add(depsMap.get("length"));
        }
    }
  }
  effects.forEach((effect: any) => effect());
}
