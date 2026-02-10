import { tarbarComponentsRegester } from '../src/common/common.js';

// 运行所有用例的入口
export default async function (test) {
    const { getRunner, getHooks, getAuth } = await tarbarComponentsRegester(test);

}