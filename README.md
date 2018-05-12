# ts-graphql

**NOTE: This library is only in the early stages and is not in an end-to-end working state yet**

Typescript custom transformers to assist with developing GraphQL based apps in Typescript.

Currently custom transformers are not supported out of box with `tsc` but can be enabled through webpack loaders like ts-loader and awesome-typescript-loader.

## How It Works

The transformers hook into the TypeScript compilation process both before and after type checking to bring type checking to your GraphQL operations.

### Before Type Checking
First, during the transformation phase before type checking takes place, two type transformations take place.

Any recognized GraphQL queries are parsed and provided with an associated type of the object that can be expected from running the query. This looks something like:

```typescript
// Before type-addition
const myQuery = `{
	user(id: "abc") {
		name
		posts {
			title
		}
	}
}`;

// After type-addition
const myQuery: GraphQLQueryString<{
	name: string;
	posts: {
		title: string;
	}[]
}> = `{
	user(id: "abc") {
		name
		posts {
			title
		}
	}
}`
```

The type definition of `GraphQLQueryString` is simply:

```typescript
type GraphQLQueryString<TResult> = string;
```

All it does it help encode the shape of the expected result.

`TResult` is constructed by comparing the query found against your GraphQL schema.

The second step is to encode the query execution function such that its return type is now associated with the `TResult` from any `GraphQLQueryString` that is provided.

**TODO** - *The design of this second step is still forthcoming, will update this section once it has been designed and implemented.*

### Type Checking

Once the types have all been encoded into your source, we let TypeScript do its normal type checking, which should now be able to perform type checking against your query results and how you use them.

### After Type Checking

**TODO** - *Need to decide if this is actually necessary, or if, since all the types will be compiled out, we can just ignore needing to revert our types.*

After type checking takes place, we go back in and clean up anything we have injected.
