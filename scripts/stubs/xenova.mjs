// Stub for @xenova/transformers used by golden tests. Throwing from
// pipeline() makes semanticSearch fall back to TF-IDF, which is
// deterministic and needs no model download — exactly what a repeatable
// test baseline requires.
export const env = {};
export const pipeline = async () => {
  throw new Error("transformers stubbed out in golden tests");
};
export default { env, pipeline };
