// Minimal obsidian API stub so plugin modules can run under plain Node
// (golden tests). Only the members referenced at module scope or during
// search need to exist.
export const normalizePath = (p) => p;
export const Platform = { isMobile: false, isDesktop: true };
export class App {}
export class Notice {}
export class TFile {}
export class Plugin {}
export class PluginSettingTab {}
export class ItemView {}
export class Setting {}
export const requestUrl = async () => { throw new Error("no network in golden tests"); };
