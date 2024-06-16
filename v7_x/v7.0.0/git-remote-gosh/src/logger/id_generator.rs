use opentelemetry::sdk::trace::{IdGenerator, RandomIdGenerator};
use opentelemetry::trace::{SpanId, TraceId};

#[derive(Clone, Debug)]
pub(crate) struct FixedIdGenerator {
    rnd: RandomIdGenerator,
    id: TraceId,
}

impl Default for FixedIdGenerator {
    fn default() -> Self {
        FixedIdGenerator {
            rnd: RandomIdGenerator::default(),
            id: TraceId::INVALID,
        }
    }
}

impl FixedIdGenerator {
    pub fn new() -> Self {
        let rnd = RandomIdGenerator::default();
        let id = rnd.new_trace_id();
        Self { rnd, id }
    }
}

impl IdGenerator for FixedIdGenerator {
    fn new_trace_id(&self) -> TraceId {
        self.id
    }

    fn new_span_id(&self) -> SpanId {
        self.rnd.new_span_id()
    }
}
