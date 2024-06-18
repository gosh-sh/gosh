use std::time::Duration;
use tokio_retry::strategy::FibonacciBackoff;

pub fn default_retry_strategy() -> impl Iterator<Item = Duration> {
    FibonacciBackoff::from_millis(100).take(20)
}
