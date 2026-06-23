import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const emptyHeader = {
  title: '',
  description: '',
  leading: null
};

export const PageHeaderContext = createContext({
  pageHeader: emptyHeader,
  setPageHeader: () => {}
});

export function PageHeaderProvider({ children }) {
  const [pageHeader, setPageHeaderState] = useState(emptyHeader);

  const setPageHeader = useCallback((value) => {
    setPageHeaderState((current) => ({ ...current, ...value }));
  }, []);

  const resetPageHeader = useCallback(() => {
    setPageHeaderState(emptyHeader);
  }, []);

  const value = useMemo(
    () => ({ pageHeader, setPageHeader, resetPageHeader }),
    [pageHeader, setPageHeader, resetPageHeader]
  );

  return (
    <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>
  );
}

PageHeaderProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function usePageHeader() {
  return useContext(PageHeaderContext);
}

export function useSetPageHeader(title, description, leading = null) {
  const { setPageHeader, resetPageHeader } = useContext(PageHeaderContext);

  const titleText = title == null ? '' : String(title);
  const descriptionText = description == null ? '' : String(description);

  useEffect(() => {
    setPageHeader({ title: titleText, description: descriptionText, leading });
    return () => resetPageHeader();
  }, [titleText, descriptionText, leading, setPageHeader, resetPageHeader]);
}
