// NOTE(wp-types): the original save.js was an intentionally empty file —
// this dynamic block renders server-side (collection-block.php) and index.ts
// registers `save: () => null`. `export {}` only marks the file as a module
// for isolatedModules; it emits no runtime code and adds no exports.
export {};
