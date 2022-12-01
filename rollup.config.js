import path from "path";
import json from "@rollup/plugin-json";
import resolvePlugin from "@rollup/plugin-node-resolve";
import ts from "rollup-plugin-typescript2";

// 1. 根据环境变量中的 TARGET 属性，获取对应模块中的 package.json
const packagesDir = path.resolve(__dirname, "packages"); // 根据当前目录（__dirname）找到 packages 目录
const packageDir = path.resolve(packagesDir, process.env.TARGET); // 根据 packages 目录找到 TARGET 配置指定的包
const resolve = (p) => path.resolve(packageDir, p); // 根据包所在的目录找到包中具体的文件
const pkj = require(resolve("package.json"));

// 2. 先对打包类型做一个映射表，根据 package.json 中配置的 formats 来格式化需要打包的内容，生成最终的rollup配置文件
const name = path.basename(packageDir); // 获取包的文件名
const outputConfig = {
  "esm-bundler": {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: "es",
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: "cjs",
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: "iife", // 立即执行函数
  },
};
const options = pkj.buildOptions;
function createConfig(format, output) {
  output.name = options.name;
  output.sourcemap = true; // 生成sourcemap
  // 生成rollup配置
  return {
    input: resolve(`src/index.ts`),
    output,
    plugins: [
      json(),
      ts({
        // ts 插件
        tsconfig: path.resolve(__dirname, "tsconfig.json"),
      }),
      resolvePlugin(), // 解析第三方模块插件
    ],
  };
}
const config = options.formats.map((format) =>
  createConfig(format, outputConfig[format])
);

// 3. 将最终的 rollup 配置导出
export default config;
