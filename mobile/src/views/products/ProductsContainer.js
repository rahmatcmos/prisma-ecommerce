import { graphql } from 'react-apollo';

import query from './query.gql';
import subscription from './subscription.gql';

import Products from './Products';

const PRODUCTS_PER_PAGE = 10;

function buildFilters(filtersEnabled, filtersValues, filterType) {

  const enabledOptionsValues = filtersValues.options.map(option => {
    return filtersEnabled[option.name];
  });

  const optionsValuesIds = [].concat.apply([], enabledOptionsValues);

  return {
    brandsIds: filtersEnabled.brands,
    attributesIds: filtersEnabled.attributes,
    optionsValuesIds,
    categoryId: filterType
  }
}

export default graphql(query, {
  options: (props) => ({
    variables: {
      ...buildFilters(props.filtersEnabled, props.filtersValues, props.filterType),
      skip: 0,
      first: PRODUCTS_PER_PAGE,
    },
  }),
  props: ({ data }) => ({
    data,
    hasMore: () => data.products.aggregate.count > data.products.length,
    refetchProducts: ({ filtersEnabled, filtersValues, filterType }) => (
      data.refetch({
        ...buildFilters(filtersEnabled, filtersValues, filterType),
        skip: 0,
        first: PRODUCTS_PER_PAGE,
      })),
    loadMoreProducts: () => (
      data.fetchMore({
        variables: {
          brandsIds: data.variables.brandsIds,
          attributesIds: data.variables.attributesIds,
          optionsValuesIds: data.variables.optionsValuesIds,
          skip: data.products.length,
        },
        updateQuery: (prevState, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return prevState;
          }

          return {
            ...prevState,
            products: [...prevState.products, ...fetchMoreResult.products],
          };
        },
      })
    ),
    subscribeToProductUpdates: () => (
      data.subscribeToMore({
        document: subscription,
        updateQuery: (prevState, { subscriptionData }) => {
          if (!subscriptionData.data) {
            return prevState;
          }

          const newProducts = {
            ...prevState.products,
            edges: prevState.products.edges.map((edge) => {
              if (edge.node.id !== subscriptionData.data.updatedProduct.id) {
                return edge;
              }

              return {
                ...edge,
                node: {
                  ...edge.node,
                  available: subscriptionData.data.updatedProduct.available,
                  unavailableOptionsValues: subscriptionData.data.updatedProduct.unavailableOptionsValues
                }
              }
            })
          }

          return {
            ...prevState,
            products: newProducts
          };
        }
      })
    )
  }),
})(Products);

