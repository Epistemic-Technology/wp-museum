/**
 * Barrel export for the wp-museum/v1 shared wire-format types.
 *
 * Each module mirrors a PHP REST controller / domain class:
 * - common.ts     — WP_Error envelope, image tuples, empty-PHP-array quirk
 * - object.ts     — Objects_Controller / combine_post_data()
 * - kind.ts       — Kinds_Controller / ObjectKind / OaiPmhMappings
 * - field.ts      — Object_Fields_Controller / MObjectField
 * - collection.ts — Collections_Controller
 * - image.ts      — Object_Image_Controller
 * - admin.ts      — Admin_Options_Controller
 * - site.ts       — Site_Data_Controller
 * - remote.ts     — Remote_Client_Controller / RemoteClient
 * - health.ts     — Dashboard_Health_Controller
 */

export * from './common';
export * from './object';
export * from './kind';
export * from './field';
export * from './collection';
export * from './image';
export * from './admin';
export * from './site';
export * from './remote';
export * from './health';
