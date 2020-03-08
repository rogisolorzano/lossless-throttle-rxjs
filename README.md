# lossless-throttle
RxJS Lossless Throttling Operator

This custom throttling operator arose from the need to throttle requests to a third party API that fail when fired too closely together. Since all of RxJS timing operators are lossy and discard extra items, a lossless solution was created.

## Demo

```
import { interval } from "rxjs";
import { throttleTime, bufferTime, auditTime } from "rxjs/operators";
import { losslessThrottle } from '.';

const source =
  interval(500).pipe();

// Can uncomment one at a time to see the difference in the numbers outputted from interval in your console

// const source =
//   interval(500).pipe(
//     losslessThrottle(3000, 1000)
//   );
// 

// const source =
//   interval(500).pipe(
//     throttleTime(3000)
//   );
// 

const subscribe = source.subscribe(val => console.log(val));
```
