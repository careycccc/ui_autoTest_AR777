// tests/tarbar.test.js
import { tarbarComponentsRegester } from '../src/common/common.js';

export default async function (test) {
    const { getRunner } = await tarbarComponentsRegester(test);

    test.test('随机点击压力测试', async () => {
        const results = await getRunner().runRandom(15, {
            minInterval: 2000,
            maxInterval: 3500,
            verify: true
        });
        console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    });
}