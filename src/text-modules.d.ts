declare module "*.html" {
  const content: string;
  export default content;
}
declare module "*.md" {
  const content: string;
  export default content;
}
declare module "@codemirror/language" {
  export function syntaxTree(state: any): { iterate(spec: { from: number; to: number; enter: (node: any) => boolean | void }): void };
}
