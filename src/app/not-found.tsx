import Link from "next/link";
import { TornEdge } from "@/components/paper/TornEdge";

export default function NotFound() {
  return (
    <main id="main" className="page-x flex-1 pt-14">
      <div className="mx-auto max-w-2xl">
        <TornEdge
          seed="not-found"
          paperClassName="px-6 pt-14 pb-10 text-center sm:px-12"
        >
          <h1 className="font-hand text-5xl">This page got torn out!</h1>
          <p className="mt-4 text-xl">
            We looked everywhere in the notebook but couldn&apos;t find it.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block font-hand text-2xl underline decoration-wavy decoration-2 underline-offset-4"
          >
            Back to notebook
          </Link>
        </TornEdge>
      </div>
    </main>
  );
}
