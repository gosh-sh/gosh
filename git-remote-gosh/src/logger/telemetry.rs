use crate::logger::id_generator::FixedIdGenerator;
use opentelemetry::sdk::Resource;
use opentelemetry::KeyValue;

const OPENTELEMETRY_FLAG: &str = "GOSH_OPENTELEMETRY";
const OPENTELEMETRY_SERVICE_NAME: &str = "gosh";
pub const OPENTELEMETRY_FILTER_LEVEL: &str = "GOSH_OPENTELEMETRY_FILTER_LEVEL";

pub(super) fn do_init_opentelemetry() -> bool {
    std::env::var(OPENTELEMETRY_FLAG).is_ok()
}

pub(super) fn opentelemetry_tracer() -> opentelemetry::sdk::trace::Tracer {
    opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(opentelemetry_otlp::new_exporter().tonic())
        .with_trace_config(
            opentelemetry::sdk::trace::config()
                .with_resource(Resource::new(vec![KeyValue::new(
                    opentelemetry_semantic_conventions::resource::SERVICE_NAME,
                    OPENTELEMETRY_SERVICE_NAME,
                )]))
                .with_id_generator(FixedIdGenerator::new()),
        )
        .install_batch(opentelemetry::runtime::Tokio)
        .expect("can't install open telemetry")
}
