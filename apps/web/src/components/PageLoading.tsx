export function PageLoading() {
  return (
    <section className="pageStack loadingState" role="status" aria-label="Загрузка данных">
      <div className="loadingHeading">
        <span className="skeleton skeletonEyebrow" />
        <span className="skeleton skeletonTitle" />
      </div>
      <div className="skeleton skeletonSummary" />
      <div className="skeleton skeletonFilters" />
      <div className="loadingCards" aria-hidden="true">
        <span className="skeleton skeletonCard" />
        <span className="skeleton skeletonCard" />
        <span className="skeleton skeletonCard" />
      </div>
      <span className="visuallyHidden">Загрузка...</span>
    </section>
  );
}
