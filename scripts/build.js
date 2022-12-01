/**
 * 把 packages 目录下的所有模块都进行打包
 */

const fs = require("fs");
const execa = require("execa"); // 开启子进程打包

// 1. 同步方式读取文件（只读取模块，即文件夹，过滤掉文件）
const targets = fs.readdirSync("packages").filter((f) => {
  if (!fs.statSync(`packages/${f}`).isDirectory()) {
    return false;
  }
  return true;
});

// 2. 对所有模块依次并行打包
async function build(target) {
  /**
   * 打包命令为：rollup -c --environment TARGET:xxx
   * 1. -c, 即 --config <filename>     使用配置文件（如果使用参数但是值没有指定, 默认就是 rollup.config.js）
   * 2. --environment TARGET:xxx       将设置传递到配置文件，在配置文件中即可通过 process.env.TARGET 获取到对应模块
   * 3. execa 的配置 stdio:'inherit'   意思是将子进程打包的信息共享给父进程
   */
  await execa("rollup", ["-c", "--environment", `TARGET:${target}`], {
    stdio: "inherit",
  });
}
function runParallel(targets, iteratorFn) {
  const res = [];
  for (const item of targets) {
    // 打包某一模块（返回的是一个Promise），将该 Promise 放到 res 数组中
    const p = iteratorFn(item);
    res.push(p);
  }
  // 并行打包所有模块
  return Promise.all(res);
}
runParallel(targets, build);
