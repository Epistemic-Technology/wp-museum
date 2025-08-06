

const withPagination = BaseComponent => props => {
	const {
		currentPage,
		totalPages,
		pagesToShow = 5,
		searchCallback,
		searchParams,
		...otherProps
	} = props;
	
	const doSearch = ( newPage ) => {
		searchParams.page = newPage;
		searchCallback( searchParams );
	}

	const PageList = () => {
		const pageItems = [];
		let startPage;
		let endPage;
		if ( totalPages > pagesToShow ) {
			if ( currentPage <= pagesToShow - 1 ) {
				startPage = 1;
				endPage = pagesToShow;
			}
			else if ( totalPages - currentPage + 1 >= pagesToShow ) {
				startPage = Math.max( 1, currentPage - Math.floor( pagesToShow / 2 ) );
				endPage = Math.min( startPage + pagesToShow - 1, totalPages );
			} else {
				startPage = totalPages - pagesToShow + 1;
				endPage = totalPages;
			}
		} else {
			startPage = 1;
			endPage = totalPages;
		}
		if ( startPage > 1 && totalPages > pagesToShow ) {
			pageItems.push(
				<li key = { -1 }>
					<button
						type = "button"
						aria-label = "Go to page 1"
						onClick = { () => doSearch( 1 ) }
					>
						{ 1 }
					</button>
				</li>
			);
		}
		if ( startPage > 2 && totalPages > pagesToShow ) {
			pageItems.push( 
				<li key = { 0 } aria-hidden="true">
					...
				</li>
			);
		}
		for ( let pageCounter = startPage; pageCounter <= endPage; pageCounter++ ) {
			pageItems.push (
				<li
					key = { pageCounter }
					className = { pageCounter == currentPage ? 
						'page-list-selected' : 'page-list-unselected'
					}
				>
					<button
						type = "button"
						aria-label = { `Go to page ${pageCounter}` }
						aria-current = { pageCounter == currentPage ? 'page' : undefined }
						onClick = { () => doSearch( pageCounter ) }
					>
						{ pageCounter }
					</button>
				</li>
			);
		}
		if ( endPage < totalPages && totalPages > pagesToShow ) {
			pageItems.push( 
				<li key = { endPage + 1 } aria-hidden="true">
					...
				</li>
			);
			pageItems.push(
				<li key = { endPage + 2 }>
					<button
						type = "button"
						aria-label = { `Go to page ${totalPages}` }
						onClick = { () => doSearch( totalPages ) }
					>
						{ totalPages }
					</button>
				</li>
			);
		}

		return (
			<ol role="navigation" aria-label="Pagination Navigation">
				{ totalPages > pagesToShow &&
					<li>
						<button
							type = "button"
							aria-label = "Go to first page"
							onClick = { () => doSearch( 1 ) }
						>
								<span className = 'pagination-symbol' aria-hidden="true">&laquo;</span>
						</button>
					</li>
				}
				{ totalPages > pagesToShow &&
					<li>
						<button
							type = "button"
							aria-label = "Go to previous page"
							disabled = { currentPage <= 1 }
							onClick = { () => doSearch( Math.max(1, currentPage - 1) ) }
						>
							<span className = 'pagination-symbol' aria-hidden="true">&lsaquo;</span>
						</button>
					</li>
				}
				{ pageItems }
				{ totalPages > pagesToShow &&
					<li>
						<button
							type = "button"
							aria-label = "Go to next page"
							disabled = { currentPage >= totalPages }
							onClick = { () => doSearch( Math.min(totalPages, currentPage + 1) ) }
						>
							<span className = 'pagination-symbol' aria-hidden="true">&rsaquo;</span>
						</button>
					</li>
				}
				{ totalPages > pagesToShow &&
					<li>
						<button
							type = "button"
							aria-label = "Go to last page"
							onClick = { () => doSearch( totalPages ) }
						>
							<span className = 'pagination-symbol' aria-hidden="true">&raquo;</span>
						</button>
					</li>
				}
			</ol>
		);
	} 

	return (
		<div className = 'paginated-component'>
			{ totalPages > 1 &&
				<div className = 'pagination'>
					<PageList />
				</div>
			}
			<BaseComponent { ...otherProps } />
			{ totalPages > 1 &&
				<div className = 'pagination'>
					<PageList />
				</div>
			}
		</div>
	);
}

export default withPagination;