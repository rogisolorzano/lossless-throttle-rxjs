# RxJS Lossless Throttling Operator

RxJS operator that losslessly throttles payloads. This operator arose from the need to losslessly throttle requests to a
third party API that failed when fired too closely together.

## Getting started

#### Install package

```bash
npm install lossless-throttle-rxjs@latest
```

#### Install peer dependencies

```bash
npm install rxjs@~7
npm install -D typescript@~4
```

## Example usage

```
import {interval} from 'rxjs';
import {losslessThrottle} from 'lossless-throttle-rxjs';

const source = interval(500).pipe(
  losslessThrottle(3000, 1000)
);

source.subscribe(num => console.log(num));
```

See [rxjs-lossless-throttle-example](https://github.com/rogisolorzano/lossless-throttle-rxjs-example) for a working example.
