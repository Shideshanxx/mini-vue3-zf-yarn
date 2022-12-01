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
 * 让某个对象中的属性收集当前它对应的effect函数
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
