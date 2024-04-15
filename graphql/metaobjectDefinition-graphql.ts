// #region Imports
import { graphql } from '../utils/tada-utils';

// #endregion

// #region Fragments
export const metaobjectFieldDefinitionFragment = graphql(`
  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {
    key
    description
    name
    required
    type {
      category
      name
      supportedValidations {
        name
        type
      }
      supportsDefinitionMigrations
    }
    validations {
      name
      type
      value
    }
  }
`);

export const metaobjectDefinitionFragment = graphql(
  `
    fragment MetaobjectDefinition on MetaobjectDefinition {
      id
      name
      displayNameKey
      type
      capabilities @include(if: $includeCapabilities) {
        publishable {
          enabled
        }
      }
      fieldDefinitions @include(if: $includeFieldDefinitions) {
        ...MetaobjectFieldDefinition
      }
    }
  `,
  [metaobjectFieldDefinitionFragment]
);
// #endregion

// #region Queries
export const getMetaobjectDefinitionsQuery = graphql(
  `
    query GetMetaobjectDefinitions(
      $maxEntriesPerRun: Int!
      $cursor: String
      $includeCapabilities: Boolean!
      $includeFieldDefinitions: Boolean!
    ) {
      metaobjectDefinitions(first: $maxEntriesPerRun, after: $cursor) {
        nodes {
          ...MetaobjectDefinition
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  [metaobjectDefinitionFragment]
);

export const getSingleMetaObjectDefinitionQuery = graphql(
  `
    query GetSingleMetaObjectDefinition($id: ID!, $includeCapabilities: Boolean!, $includeFieldDefinitions: Boolean!) {
      metaobjectDefinition(id: $id) {
        ...MetaobjectDefinition
      }
    }
  `,
  [metaobjectDefinitionFragment]
);

export const getSingleMetaobjectDefinitionByTypeQuery = graphql(
  `
    query GetSingleMetaObjectDefinitionByType(
      $type: String!
      $includeCapabilities: Boolean!
      $includeFieldDefinitions: Boolean!
    ) {
      metaobjectDefinitionByType(type: $type) {
        ...MetaobjectDefinition
      }
    }
  `,
  [metaobjectDefinitionFragment]
);
// #endregion

// #region Mutations

// #endregion

// console.log('metaobjectFragmentNew', JSON.stringify(metaobjectFragmentNew));
// const lol = visit(metaobjectFragmentNew,  (node) => {
//   if (node.key === 'definition') {
//     node.key = 'definitionNew';
//   }
// });
// const editedAST = visit(metaobjectFragmentNew, {
//   enter(node, key, parent, path, ancestors) {
//     return;
//     // @return
//     //   undefined: no action
//     //   false: skip visiting this node
//     //   visitor.BREAK: stop visiting altogether
//     //   null: delete this node
//     //   any value: replace this node with the returned value
//   },
//   leave(node, key, parent, path, ancestors) {
//     if (node.kind === 'FragmentDefinition' && node.name.value === 'MetaobjectFragment') {
//       console.log('node', node);
//       node.selectionSet.selections = [
//         ...node.selectionSet.selections,
//         {
//           kind: 'Field',
//           alias: { kind: 'Name', value: 'cacaprout' },
//           name: { kind: 'Name', value: 'field' },
//           arguments: [
//             {
//               kind: 'Argument',
//               name: { kind: 'Name', value: 'key' },
//               value: {
//                 kind: 'StringValue',
//                 value: 'chiotte',
//                 block: false,
//               },
//             },
//           ],
//           directives: [],
//           selectionSet: {
//             kind: 'SelectionSet',
//             selections: [
//               {
//                 kind: 'Field',
//                 name: { kind: 'Name', value: 'key' },
//                 arguments: [],
//                 directives: [],
//               },
//               {
//                 kind: 'Field',
//                 name: { kind: 'Name', value: 'type' },
//                 arguments: [],
//                 directives: [],
//               },
//               {
//                 kind: 'Field',
//                 name: { kind: 'Name', value: 'value' },
//                 arguments: [],
//                 directives: [],
//               },
//             ],
//           },
//         },
//         // {
//         //   kind: 'Field',
//         //   name: {
//         //     kind: 'Name',
//         //     value: 'lolilol',
//         //   },
//         // }
//       ];
//       return node;
//     }
//     // console.log('node', node);
//     // console.log('key', key);
//     return;
//     // @return
//     //   undefined: no action
//     //   false: no action
//     //   visitor.BREAK: stop visiting altogether
//     //   null: delete this node
//     //   any value: replace this node with the returned value
//   },
// });
// console.log('editedAST', editedAST);
// // printGql(editedAST);
// console.log('printGql(editedAST)', printGql(editedAST));
