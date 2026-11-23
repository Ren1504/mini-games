// Types for the Workers test runtime:
// - `env` from "cloudflare:test" has the Durable Object binding,
// - `exports` from "cloudflare:workers" is our worker module.
declare namespace Cloudflare {
  interface Env {
    ImposterRoom: DurableObjectNamespace;
  }
  interface GlobalProps {
    mainModule: typeof import("../src/index");
  }
}
