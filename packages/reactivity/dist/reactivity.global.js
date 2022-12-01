var VueReactivity = (function (exports) {
  'use strict';

  const isObject = (value) => {
      return typeof value === "object" && value !== null;
  };
  const extend = Object.assign;
  const isArray = Array.isArray;
  // 是否是整数
  const isIntegerKey = (key) => parseInt(key) + "" === key;
  const hasOwn = (target, key) => {
      return Object.prototype.hasOwnProperty.call(target, key);
  };
  const hasChanged = (oldValue, value) => oldValue !== value;

  function effect(fn, options = {}) {
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
              }
              finally {
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
  function track(target, type, key) {
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
  function trigger(target, type, key, newValue, oldValue) {
      console.log(target, type, key, newValue, oldValue);
      // 如果这个属性没有收集过effect，那不需要做任何操作
      const depsMap = targetMap.get(target);
      if (!depsMap)
          return;
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
      }
      else {
          // 2. 如果是对象
          if (key !== undefined) {
              // 这里一定是修改属性
              // 新增属性不会触发它的effect重新执行（如果是新增的属性，下方的get方法返回undefined），因为新增的属性之前没有出现在effect的fn中，该属性没有收集过effect
              add(depsMap.get(key));
          }
          // 3. 如果修改数组中的某一个索引对应的元素
          switch (type) {
              // 如果通过索引增加了数组长度就触发长度的更新
              case 0 /* TriggerOrTypes.ADD */:
                  if (isArray(target) && isIntegerKey(key)) {
                      add(depsMap.get("length"));
                  }
          }
      }
      effects.forEach((effect) => effect());
  }

  function createGetter(isReadonly = false, shallow = false) {
      // receiver 是代理对象，即 proxy 对象
      return function get(target, key, receiver) {
          /**
           * Reflect 的优势：
           * 1. 后续 Object 上的方法都会被迁移到 Reflect 上，例如 Object.getPrototypeof()
           * 2. 通过 target[key] = value 修改失败不会报错，而 Reflect.set 有返回值，可以判断是否修改成功
           * 3. Reflect 方法具备返回值
           */
          const res = Reflect.get(target, key, receiver);
          if (!isReadonly) {
              // 执行effect的fn时会取值，此时将对应的 effect 收集起来
              track(target, 0 /* TrackOpTypes.GET */, key);
          }
          if (shallow) {
              return res;
          }
          if (isObject(res)) {
              // 【***】vue3 当取值时才进行递归处理子属性，而vue2是在初始化时就一次性递归到底对对象所有层级的属性进行代理
              return isReadonly ? readonly(res) : reactive(res);
          }
          return res;
      };
  }
  function createSetter(shallow = false) {
      return function set(target, key, value, receiver) {
          const oldValue = target[key]; // 获取老的值
          // 当通过索引修改数组元素时hadKey为true，当通过索引新增数组元素时hadKey为false；当修改对象属性时hadKey为true，当新增对象属性时hadKey为false
          let hadKey = isArray(target) && isIntegerKey(key)
              ? Number(key) < target.length
              : hasOwn(target, key);
          const result = Reflect.set(target, key, value, receiver); // 修改属性
          // 当数据更新时，通知对应属性的所有 effect 重新执行
          if (!hadKey) {
              // 通过索引新增数组元素，或新增对象属性时
              trigger(target, 0 /* TriggerOrTypes.ADD */, key, value);
          }
          else if (hasChanged(oldValue, value)) {
              // 通过索引修改数组元素，或修改对象属性和数组length时
              trigger(target, 1 /* TriggerOrTypes.SET */, key, value, oldValue);
          }
          return result;
      };
  }
  const get = createGetter();
  const shallowGet = createGetter(false, true);
  const readonlyGet = createGetter(true);
  const shallowReadonlyGet = createGetter(true, true);
  const set = createSetter();
  const shallowSet = createSetter(true);
  const mutableHandlers = {
      get,
      set,
  };
  const shallowReactiveHandlers = {
      get: shallowGet,
      set: shallowSet,
  };
  let readonlyObj = {
      set: (target, key) => {
          console.warn(`set on key ${key} failed`);
      },
  };
  const readonlyHandlers = extend({
      get: readonlyGet,
  }, readonlyObj);
  const shallowReadonlyHandlers = extend({
      get: shallowReadonlyGet,
  }, readonlyObj);

  function reactive(target) {
      return createReactiveObject(target, false, mutableHandlers);
  }
  function shallowReactive(target) {
      return createReactiveObject(target, false, shallowReactiveHandlers);
  }
  function readonly(target) {
      return createReactiveObject(target, true, readonlyHandlers);
  }
  function shallowReadonly(target) {
      return createReactiveObject(target, true, shallowReadonlyHandlers);
  }
  // WeakMap 存储的key只能是对象，key是对对象的弱引用，会进行垃圾回收，不会造成内存泄漏
  // 使用两个 WeakMap 存储 proxy 对象，是因为 readonly 可以处理一个已经经过代理的对象
  const reactiveMap = new WeakMap();
  const readonlyMap = new WeakMap();
  function createReactiveObject(target, isReadonly, baseHandlers) {
      // reactive 只处理对象
      if (!isObject(target)) {
          return target;
      }
      const proxyMap = isReadonly ? readonlyMap : reactiveMap;
      const existProxy = proxyMap.get(target);
      if (existProxy) {
          return existProxy; // 如果已经代理过了，则直接返回
      }
      const proxy = new Proxy(target, baseHandlers);
      proxyMap.set(target, proxy); // 将要代理的对象和对应的代理结果缓存起来
      return proxy;
  }

  exports.effect = effect;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
//# sourceMappingURL=reactivity.global.js.map
