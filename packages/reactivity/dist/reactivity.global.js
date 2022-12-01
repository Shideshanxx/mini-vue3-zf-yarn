var VueReactivity = (function (exports) {
  'use strict';

  const isObject = (value) => {
      return typeof value === "object" && value !== null;
  };
  const extend = Object.assign;

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
          const result = Reflect.set(target, key, value, receiver);
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

  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
//# sourceMappingURL=reactivity.global.js.map
