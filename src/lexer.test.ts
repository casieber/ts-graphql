import { parse } from 'graphql';

import { documentToType } from './lexer';

describe('documentToType()', () => {
	test('works for single item', () => {
		const result = documentToType(parse(`{ name }`));
		expect(result).toEqual({ name: true });
	});

	test('works for multiple top level fields', () => {
		const result = documentToType(parse(`{ name age height }`));
		expect(result).toEqual({
			name: true,
			age: true,
			height: true,
		});
	});

	test('works for single deep fields', () => {
		const result = documentToType(
			parse(`{ this { is { a { deep { field } } } } }`),
		);
		expect(result).toEqual({
			this: {
				is: {
					a: {
						deep: {
							field: true,
						},
					},
				},
			},
		});
	});

	test('works for mixed field levels', () => {
		const result = documentToType(
			parse(`{
				name {
					first
					last
				}
				age
				posts {
					title
					comments {
						text
						author {
							name
						}
					}
				}
			}`),
		);

		expect(result).toEqual({
			name: {
				first: true,
				last: true,
			},
			age: true,
			posts: {
				title: true,
				comments: {
					text: true,
					author: {
						name: true,
					},
				},
			},
		});
	});
});
