/**
 * WordPress dependencies
 */
import { useState, useEffect } from "@wordpress/element";

import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

import {
  PanelBody,
  CheckboxControl,
  SelectControl,
} from "@wordpress/components";

import apiFetch from "@wordpress/api-fetch";

//import './editor.scss';

/**
 * Internal dependencies
 */
import { AdvancedSearchUI, ObjectGrid, withPagination } from "../../components";

import type {
  Collection,
  MuseumObject,
  MuseumObjectSearchParams,
  ObjectFieldsResponse,
  ObjectKind,
} from "../../types";

const PaginatedObjectGrid = withPagination(ObjectGrid);

/** One entry of the `searchFields` array assembled by AdvancedSearchUI. */
interface SearchFieldEntry {
  field?: string | null;
  search?: string | null;
}

/**
 * Search params handled by this block: the values assembled by
 * AdvancedSearchUI plus the pagination/limit keys added here and by
 * withPagination.
 *
 * TODO(ts-migration): pre-existing bug — the server ignores posts_per_page,
 * selectedFlags, selectedKind, and searchFields (only per_page, page, status,
 * s/searchText, onlyTitle, post_title, post_content, tilde-prefixed field
 * slugs, selectedCollections, and selectedTags are read); shape preserved
 * as-is.
 */
interface AdvancedSearchParams {
  page?: number;
  per_page?: number;
  posts_per_page?: number;
  searchText?: string;
  onlyTitle?: boolean;
  selectedFlags?: string[];
  selectedCollections?: string[] | number[];
  selectedTags?: string[];
  selectedKind?: number | string;
  searchFields?: SearchFieldEntry[];
}

interface AdvancedSearchAttributes {
  defaultSearch?: string;
  fixSearch?: boolean;
  runOnLoad?: boolean;
  showObjectType?: boolean;
  showTitleToggle?: boolean;
  showFlags?: boolean;
  showCollections?: boolean;
  showTags?: boolean;
  showFields?: boolean;
  gridRows?: number;
  columns?: number;
  resultsPerPage?: number;
}

interface AdvancedSearchEditProps {
  attributes: AdvancedSearchAttributes;
  setAttributes: (attributes: Partial<AdvancedSearchAttributes>) => void;
}

const AdvancedSearchEdit = (props: AdvancedSearchEditProps) => {
  const { attributes, setAttributes } = props;

  const {
    defaultSearch,
    fixSearch,
    runOnLoad,
    showObjectType,
    showTitleToggle,
    showFlags,
    showCollections,
    showTags,
    showFields,
    gridRows,
    columns,
    resultsPerPage,
  } = attributes;

  // NOTE(wp-types): the initial state is an empty OBJECT while the
  // fetched value (and AdvancedSearchUI's prop type) is an array; cast
  // preserves the existing literal.
  const [collectionData, setCollectionData] = useState<Collection[]>(
    {} as unknown as Collection[],
  );
  const [kindsData, setKindsData] = useState<ObjectKind[]>([]);
  const [searchResults, setSearchResults] = useState<MuseumObject[]>([]);
  const [currentSearchParams, setCurrentSearchParams] =
    useState<AdvancedSearchParams>({});

  const baseRestPath = "/wp-museum/v1";

  useEffect(() => {
    updateCollectionData();
    updateKindsData();
  }, []);

  const updateCollectionData = () => {
    apiFetch<Collection[]>({ path: `${baseRestPath}/collections` }).then(
      (result) => setCollectionData(result),
    );
  };

  const updateKindsData = () => {
    apiFetch<ObjectKind[]>({ path: `${baseRestPath}/mobject_kinds` }).then(
      (result) => setKindsData(result),
    );
  };

  const getFieldData = (postType: string) => {
    return apiFetch<ObjectFieldsResponse>({
      path: `${baseRestPath}/${postType}/fields`,
    });
  };

  const onSearch = (searchParams: AdvancedSearchParams) => {
    for (const [key, value] of Object.entries(searchParams)) {
      if (
        key != "page" &&
        value != (currentSearchParams as Record<string, unknown>)[key]
      ) {
        searchParams["page"] = 1;
        break;
      }
    }
    // Use resultsPerPage setting (-1 means unlimited/all results)
    // TODO(ts-migration): pre-existing bug — the server ignores
    // `posts_per_page` (only `per_page` is read); preserved as-is.
    searchParams["posts_per_page"] = resultsPerPage;
    setCurrentSearchParams(searchParams);
    apiFetch<MuseumObject[]>({
      path: `${baseRestPath}/search`,
      method: "POST",
      data: searchParams,
    }).then((result) => {
      setSearchResults(result);
    });
  };

  const blockProps = useBlockProps();

  return (
    <div {...blockProps}>
      <InspectorControls>
        <PanelBody title="Search Options">
          <CheckboxControl
            label="Fix Search"
            checked={fixSearch}
            onChange={(val) => setAttributes({ fixSearch: val })}
          />
          <CheckboxControl
            label="Run Search on Load"
            checked={runOnLoad}
            onChange={(val) => setAttributes({ runOnLoad: val })}
          />
        </PanelBody>
        <PanelBody title="Search Sections">
          <CheckboxControl
            label="Show Object Type"
            checked={showObjectType}
            onChange={(val) => setAttributes({ showObjectType: val })}
          />
          <CheckboxControl
            label="Show Title Toggle"
            checked={showTitleToggle}
            onChange={(val) => setAttributes({ showTitleToggle: val })}
          />
          <CheckboxControl
            label="Show Flags"
            checked={showFlags}
            onChange={(val) => setAttributes({ showFlags: val })}
          />
          <CheckboxControl
            label="Show Collections"
            checked={showCollections}
            onChange={(val) => setAttributes({ showCollections: val })}
          />
          <CheckboxControl
            label="Show Tags"
            checked={showTags}
            onChange={(val) => setAttributes({ showTags: val })}
          />
          <CheckboxControl
            label="Show Fields"
            checked={showFields}
            onChange={(val) => setAttributes({ showFields: val })}
          />
        </PanelBody>
        <PanelBody title="Results">
          {/* NOTE(wp-types): SelectControl's types expect string values,
              but these numeric option values (and numeric value props) work
              at runtime; cast to keep behavior. */}
          <SelectControl
            label="Results per Page"
            value={resultsPerPage as any}
            onChange={(val) => setAttributes({ resultsPerPage: parseInt(val) })}
            options={
              [
                { value: 20, label: "20" },
                { value: 40, label: "40" },
                { value: 60, label: "60" },
                { value: 80, label: "80" },
                { value: 100, label: "100" },
                { value: -1, label: "Unlimited" },
              ] as any
            }
          />
          <SelectControl
            label="Grid Columns"
            value={columns as any}
            onChange={(val) => setAttributes({ columns: parseInt(val) })}
            options={
              [
                { value: 1, label: "1" },
                { value: 2, label: "2" },
                { value: 3, label: "3" },
                { value: 4, label: "4" },
                { value: 5, label: "5" },
                { value: 6, label: "6" },
              ] as any
            }
          />
        </PanelBody>
      </InspectorControls>
      <AdvancedSearchUI
        defaultSearch={defaultSearch}
        showFlags={showFlags}
        showCollections={showCollections}
        showTags={showTags}
        showFields={showFields}
        showObjectType={showObjectType}
        fixSearch={fixSearch}
        showTitleToggle={showTitleToggle}
        collectionData={collectionData}
        kindsData={kindsData}
        getFieldData={getFieldData}
        inEditor={true}
        setAttributes={setAttributes}
        onSearch={onSearch}
      />
      {searchResults && searchResults.length > 0 && (
        <PaginatedObjectGrid
          /* TODO(ts-migration): pre-existing bug — `query_data` never exists
             on the wire (schema-stripped); pagination info actually arrives
             via X-WP-* headers, so these fall back to 1 / 0. Casts preserve
             current behavior. */
          currentPage={(searchResults[0] as any)?.query_data?.current_page || 1}
          totalPages={(searchResults[0] as any)?.query_data?.num_pages || 0}
          searchCallback={onSearch}
          /* NOTE(wp-types): AdvancedSearchParams carries extra keys
             (searchFields, posts_per_page, …) beyond MuseumObjectSearchParams'
             index signature; cast preserves what is sent today. */
          searchParams={currentSearchParams as MuseumObjectSearchParams}
          mObjects={searchResults}
          columns={columns}
          displayTitle={true}
          displayDate={false}
          displayExcerpt={true}
          linkToObjects={false}
          doObjectModal={true}
        />
      )}
    </div>
  );
};

export default AdvancedSearchEdit;
