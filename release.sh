#!/bin/bash
set -euo pipefail

# ============================================================================
# release.sh — Automate version bump, build, package, and GitHub release
# ============================================================================

PLUGIN_FILE="./wp-museum.php"
BASE_RELEASE_DIR="./release"
SUB_RELEASE_DIR="wp-museum"
RELEASE_DIR="${BASE_RELEASE_DIR}/${SUB_RELEASE_DIR}"
RELEASE_FILE="${SUB_RELEASE_DIR}.zip"
BLOCKS_BUILD_DIR="./build"
REACT_DIR="${RELEASE_DIR}/react"

# --- Defaults ---------------------------------------------------------------
BUMP_TYPE=""
DRY_RUN=false
SKIP_BUILD=false
ALLOW_BRANCH=false

# ============================================================================
# Helpers
# ============================================================================

usage() {
	cat <<-'USAGE'
	Usage: ./release.sh --major | --minor | --patch [OPTIONS]

	Version bump (exactly one required):
	  --major         Bump major version (0.7.5 -> 1.0.0)
	  --minor         Bump minor version (0.7.5 -> 0.8.0)
	  --patch         Bump patch version (0.7.5 -> 0.7.6)

	Options:
	  --dry-run       Preview version, release notes, and commands without executing
	  --skip-build    Skip npm build step (reuse existing build/ directory)
	  --allow-branch  Allow release from a non-main branch
	  --help          Show usage
	USAGE
}

die() {
	echo "Error: $*" >&2
	exit 1
}

info() {
	echo "==> $*"
}

# Read the current version from wp-museum.php header
read_version() {
	sed -n 's/^[[:space:]]*\* Version:[[:space:]]*\(.*\)$/\1/p' "$PLUGIN_FILE" | tr -d '[:space:]'
}

# Compute the next version given current version and bump type
compute_new_version() {
	local current="$1" bump="$2"
	local major minor patch
	IFS='.' read -r major minor patch <<< "$current"

	case "$bump" in
		major) echo "$((major + 1)).0.0" ;;
		minor) echo "${major}.$((minor + 1)).0" ;;
		patch) echo "${major}.${minor}.$((patch + 1))" ;;
	esac
}

# Get the previous tag (most recent tag reachable from HEAD)
get_previous_tag() {
	git describe --tags --abbrev=0 2>/dev/null || echo ""
}

# Generate release notes from git log between two refs
generate_release_notes() {
	local prev_tag="$1" new_tag="$2"
	local log_range notes

	if [ -n "$prev_tag" ]; then
		log_range="${prev_tag}..HEAD"
	else
		log_range="HEAD"
	fi

	# Get commits, filtering out version bump and merge commits
	notes=$(git log --format="- %s" "$log_range" \
		| grep -v -E "^- (Version bump to|Merge (branch|pull request))" \
		|| true)

	if [ -z "$notes" ]; then
		notes="- Maintenance release"
	fi

	echo "$notes"

	if [ -n "$prev_tag" ]; then
		echo ""
		echo "**Full Changelog**: https://github.com/Epistemic-Technology/wp-museum/compare/${prev_tag}...${new_tag}"
	fi
}

# ============================================================================
# Argument parsing
# ============================================================================

while [ $# -gt 0 ]; do
	case "$1" in
		--major)      BUMP_TYPE="major" ;;
		--minor)      BUMP_TYPE="minor" ;;
		--patch)      BUMP_TYPE="patch" ;;
		--dry-run)    DRY_RUN=true ;;
		--skip-build) SKIP_BUILD=true ;;
		--allow-branch) ALLOW_BRANCH=true ;;
		--help)       usage; exit 0 ;;
		*)            die "Unknown option: $1. Use --help for usage." ;;
	esac
	shift
done

if [ -z "$BUMP_TYPE" ]; then
	usage
	die "Exactly one of --major, --minor, or --patch is required."
fi

# ============================================================================
# Pre-flight checks
# ============================================================================

info "Running pre-flight checks..."

# Branch check
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$ALLOW_BRANCH" = false ]; then
	die "Must be on 'main' branch (currently on '${CURRENT_BRANCH}'). Use --allow-branch to override."
fi

# Clean working tree
if [ -n "$(git status --porcelain)" ]; then
	die "Working tree is not clean. Commit or stash changes before releasing."
fi

# Required tools
for tool in npm gh git zip; do
	if ! command -v "$tool" &>/dev/null; then
		die "Required tool '$tool' not found in PATH."
	fi
done

# GitHub CLI auth
if ! gh auth status &>/dev/null; then
	die "'gh auth status' failed. Please authenticate with: gh auth login"
fi

# Read current version and compute new version
CURRENT_VERSION=$(read_version)
if [ -z "$CURRENT_VERSION" ]; then
	die "Could not read current version from ${PLUGIN_FILE}."
fi

NEW_VERSION=$(compute_new_version "$CURRENT_VERSION" "$BUMP_TYPE")
NEW_TAG="v${NEW_VERSION}"

# Check tag doesn't already exist
if git rev-parse "$NEW_TAG" &>/dev/null; then
	die "Tag '${NEW_TAG}' already exists."
fi

PREV_TAG=$(get_previous_tag)

info "Current version: ${CURRENT_VERSION}"
info "New version:     ${NEW_VERSION} (${BUMP_TYPE} bump)"
info "New tag:         ${NEW_TAG}"
info "Previous tag:    ${PREV_TAG:-<none>}"

# ============================================================================
# Dry-run mode
# ============================================================================

if [ "$DRY_RUN" = true ]; then
	echo ""
	echo "========== DRY RUN =========="
	echo ""
	echo "Release notes preview:"
	echo "---"
	generate_release_notes "$PREV_TAG" "$NEW_TAG"
	echo "---"
	echo ""
	echo "Commands that would execute:"
	echo "  1. sed -i '' 's/\\* Version: ${CURRENT_VERSION}/* Version: ${NEW_VERSION}/' ${PLUGIN_FILE}"
	echo "  2. git add ${PLUGIN_FILE} && git commit -m \"Version bump to ${NEW_VERSION}\""
	if [ "$SKIP_BUILD" = false ]; then
		echo "  3. rm -rf ${BLOCKS_BUILD_DIR} && npm run build"
	else
		echo "  3. (skipped) npm run build"
	fi
	echo "  4. Create ${BASE_RELEASE_DIR}/${RELEASE_FILE} with packaged plugin"
	echo "  5. git tag -a ${NEW_TAG} -m \"Release ${NEW_TAG}\""
	echo "  6. git push origin ${CURRENT_BRANCH} && git push origin --tags"
	echo "  7. gh release create ${NEW_TAG} ${BASE_RELEASE_DIR}/${RELEASE_FILE} --title \"${NEW_TAG}\" --draft"
	echo ""
	echo "No changes were made."
	exit 0
fi

# ============================================================================
# Step 1: Version bump
# ============================================================================

info "Bumping version in ${PLUGIN_FILE}..."
sed -i '' "s/\\* Version: ${CURRENT_VERSION}/* Version: ${NEW_VERSION}/" "$PLUGIN_FILE"

# Verify the change
UPDATED_VERSION=$(read_version)
if [ "$UPDATED_VERSION" != "$NEW_VERSION" ]; then
	die "Version update failed. Expected '${NEW_VERSION}', got '${UPDATED_VERSION}'."
fi

git add "$PLUGIN_FILE"
git commit -m "Version bump to ${NEW_VERSION}"
info "Committed version bump."

# ============================================================================
# Step 2: Build
# ============================================================================

if [ "$SKIP_BUILD" = false ]; then
	info "Building assets..."
	rm -rf "$BLOCKS_BUILD_DIR"
	npm run build

	if [ ! -d "$BLOCKS_BUILD_DIR" ] || [ -z "$(ls -A "$BLOCKS_BUILD_DIR")" ]; then
		die "Build failed — ${BLOCKS_BUILD_DIR} is empty or missing."
	fi
	info "Build complete."
else
	info "Skipping build (--skip-build)."
	if [ ! -d "$BLOCKS_BUILD_DIR" ] || [ -z "$(ls -A "$BLOCKS_BUILD_DIR")" ]; then
		die "Build directory ${BLOCKS_BUILD_DIR} is empty or missing. Remove --skip-build to rebuild."
	fi
fi

# ============================================================================
# Step 3: Package
# ============================================================================

info "Packaging release..."

# Clean and create release directories
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR" "$REACT_DIR"

# Copy files
cp "$PLUGIN_FILE" "$RELEASE_DIR/"
cp -r "$BLOCKS_BUILD_DIR"/* "$REACT_DIR/"
cp -r ./src/* "$RELEASE_DIR/"

# Patch DEV_BUILD to false in the release copy
sed -i '' 's/const DEV_BUILD = true/const DEV_BUILD = false/' "$RELEASE_DIR/wp-museum.php"

# Create zip
cd "$BASE_RELEASE_DIR"
zip -r "$RELEASE_FILE" "$SUB_RELEASE_DIR"
cd ..

info "Created ${BASE_RELEASE_DIR}/${RELEASE_FILE}"

# ============================================================================
# Step 4: Tag and push
# ============================================================================

info "Tagging ${NEW_TAG}..."
git tag -a "$NEW_TAG" -m "Release ${NEW_TAG}"

info "Pushing to origin..."
git push origin "$CURRENT_BRANCH"
git push origin --tags

# ============================================================================
# Step 5: GitHub release
# ============================================================================

info "Creating GitHub draft release..."

RELEASE_NOTES=$(generate_release_notes "$PREV_TAG" "$NEW_TAG")

gh release create "$NEW_TAG" \
	"${BASE_RELEASE_DIR}/${RELEASE_FILE}" \
	--title "$NEW_TAG" \
	--notes "$RELEASE_NOTES" \
	--draft

RELEASE_URL=$(gh release view "$NEW_TAG" --json url --jq '.url')

# ============================================================================
# Step 6: Cleanup
# ============================================================================

info "Cleaning up release directory..."
rm -rf "$RELEASE_DIR"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "============================================"
echo "  Release ${NEW_TAG} created successfully!"
echo "============================================"
echo ""
echo "  Version:       ${NEW_VERSION}"
echo "  Tag:           ${NEW_TAG}"
echo "  Zip:           ${BASE_RELEASE_DIR}/${RELEASE_FILE}"
echo "  Draft release: ${RELEASE_URL}"
echo ""
echo "  Review the draft release on GitHub and publish when ready."
echo ""
