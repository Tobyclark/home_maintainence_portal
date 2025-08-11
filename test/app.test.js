// Basic tests for the Home Maintenance Portal app
const request = require('supertest');
const express = require('express');
let app;

beforeAll(() => {
	// Import the actual app
	app = require('../server');
});

describe('Home Maintenance Portal', () => {
	it('should load the home page', async () => {
		const res = await request(app).get('/');
		expect(res.statusCode).toBe(200);
		expect(res.text).toMatch(/Home Maintenance Portal/);
	});

	it('should return 404 for unknown route', async () => {
		const res = await request(app).get('/not-a-real-route');
		expect(res.statusCode).toBe(404);
	});
});
