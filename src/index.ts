import { Observable, of, EMPTY } from "rxjs";
import { concatMap, delay, scan } from 'rxjs/operators';

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
   * Whether the payload has been scheduled.
   */
  scheduled: boolean;
  /**
   * The payload being throttled.
   */
  payload: T;
}

/**
 * Returns a closure that checks if the payload emitTime is
 * within the current period.
 *
 * @param {number} now
 * @param {number} period
 * @return {(data: ThrottleInterface<T>) => boolean}
 */
const isWithinCurrentPeriod = <T>(now: number, period: number) =>
  (data: ThrottleInterface<T>) => data.emitTime > now - period;

/**
 * Returns a closure that schedules the incoming payloads based
 * on rate, period, and maxBuffer config.
 *
 * @param {number} rate
 * @param {number} period
 * @param {number} maxBuffer
 * @return {(queue: ThrottleInterface<T>[], payload: T) => ThrottleInterface<T>[]}
 */
const schedulePayload = <T>(rate: number, period: number, maxBuffer?: number) =>
  (queue: ThrottleInterface<T>[], payload: T) => {
  const now = Date.now();

  queue = queue.filter(isWithinCurrentPeriod(now, period));

  if (!!maxBuffer && queue.length === maxBuffer) {
    return queue;
  }

  queue.push({
    delay: (queue.length > 0) ? rate : 0,
    emitTime: (queue.length > 0) ? queue[0].emitTime + rate : now,
    payload,
    scheduled: false
  });

  return queue;
}

/**
 * Executes the scheduled payload. Decides if the payload should be emitted
 * immediately, N time from now, or if it shouldn't be emitted at all.
 *
 * @param {ThrottleInterface<T>[]} queue
 */
const executeSchedule = <T>(queue: ThrottleInterface<T>[]) => {
  const lastItem = queue[queue.length - 1];

  if (lastItem.scheduled) {
    return EMPTY;
  }

  lastItem.scheduled = true;
  const observable = of(lastItem.payload);

  return lastItem.delay ? observable.pipe(delay(lastItem.delay)) : observable;
};

/**
 * An RxJS operator that throttles losslessly. Rate and period can be used to fine-tune the behavior.
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
 * @param {number} maxBuffer We can put a hard limit on the size of the queue to prevent unbound memory growth.
 */
export const losslessThrottle = <T>(rate: number, period: number, maxBuffer?: number) => (
  source: Observable<T>,
) =>
  new Observable<T>(observer =>
    source
      .pipe(
        scan(schedulePayload<T>(rate, period, maxBuffer), []),
        concatMap(executeSchedule),
      )
      .subscribe({
        next(payload) {
          observer.next(payload as T);
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      }),
  );
