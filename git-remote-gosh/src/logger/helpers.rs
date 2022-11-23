use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Once;
use std::time::Duration;
use tokio::time::sleep;
use crate::logger::set_log_verbosity;

static TEST_LOGGER: Once = Once::new();
static CALL_COUNT: AtomicUsize = AtomicUsize::new(0);

pub async fn init_logger() {
    TEST_LOGGER.call_once(|| {
        set_log_verbosity(5);
    });
    CALL_COUNT.fetch_add(1, Ordering::SeqCst);
}

pub async fn shutdown_logger() {
    CALL_COUNT.fetch_sub(1, Ordering::SeqCst);
    if CALL_COUNT.load(Ordering::SeqCst) == 0 {
        sleep(Duration::from_secs(10)).await;
        // shutdown_tracer_provider();
    }
}
