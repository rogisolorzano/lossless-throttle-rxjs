import { Observable, of } from "rxjs";
import { concatMap, delay, filter, scan } from "rxjs/operators";

/**
 * Represents an object that holds the payload and metadata related to the payload's throttling.
 */
export interface ThrottleInterface<T> {
  /**
   * The amount of ms this payload was delayed for.
   */
  delay: number;
  /**
   * The timestamp representing when the delay will be up and the payload will be emitted.
   */
  emitTime: number;
  /**
   * The payload being throttled.
   */
  payload: T;
}

/**
 * A function used to filter payloads.
 */
type FilterFn = (value: any) => boolean;

/**
 * An RxJS operator that throttles losslessy. Rate and period can be used to fine-tune the behavior.
 *
 * @note When using, make sure that the consumer (this operator) is on average faster than the
 *       producer by choosing a suitable rate and period, or backpressure could become an issue which
 *       could result in unbound memory growth. You can set a fallback maxBuffer to be safe, but
 *       be aware that any overflow payloads are discarded similar to RxJS's throttle operator.
 *
 * @param {number} rate The rate at which to throttle the payloads. This will be the fastest rate
 *                      at which payloads will be emitted.
 * @param {number} period The time period where another payload coming in should trigger throttling.
 *                        If this is way too big compared to the average frequency that payloads come
 *                        in, everything will fit within the period, so everything will be throttled.
 *                        If it is way too small, nothing will be throttled.
 * @param {FilterFn} filterFn An optional function used to perform additional filtering inside this observable.
 * @param {number} maxBuffer We can put a hard limit on the size of the queue to prevent unbound memory growth.
 */
export const losslessThrottle = (rate: number, period: number, filterFn: Optional<FilterFn> = undefined, maxBuffer: Optional<number> = undefined) =>
  <T>(source: Observable<T>) =>
    new Observable<T>(observer =>
      source.pipe(
        filter((payload: T) => !filterFn || filterFn(payload)),
        scan((queue: Array<ThrottleInterface<T>>, payload: T) => {
          const now = Date.now();

          // Only data within the current period is relevant.
          queue = queue.filter((data: ThrottleInterface<T>) => data.emitTime > now - period);

          if (!!maxBuffer && queue.length === maxBuffer) {
            return queue;
          }

          if (queue.length > 0) {
            // If queue isn't empty, this payload is throttled as well to maintain the order.
            queue.push({ delay: rate, emitTime: queue[0].emitTime + rate, payload });
          } else {
            // If the queue is empty, fire immediately.
            queue.push({ delay: 0, emitTime: now, payload });
          }

          return queue;
        }, []),
        concatMap((queue) => {
          const lastItem = queue[queue.length - 1];
          const observable = of(lastItem.payload);
          // Emit the payload we received as an observable, immediately or with a delay.
          return lastItem.delay ? observable.pipe(delay(lastItem.delay)) : observable;
        })
      ).subscribe({
        next(payload) { observer.next(payload); },
        error(err) { observer.error(err); },
        complete() { observer.complete(); }
      })
    );
