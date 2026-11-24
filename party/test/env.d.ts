// Types for the Workers test runtime:
// - `env` from "cloudflare:test" has the Durable Object bindings,
// - `exports` from "cloudflare:workers" is our worker module.
declare namespace Cloudflare {
  interface Env {
    ImposterRoom: DurableObjectNamespace;
    ChessRoom: DurableObjectNamespace;
  }
  interface GlobalProps {
    mainModule: typeof import("../src/index");
  }
}
