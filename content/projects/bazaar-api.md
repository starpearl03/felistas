---
name: Bazaar API
kind: REST backend
status: DONE
year: "2025"
order: 4
stack: [Java, Spring Boot, MongoDB, Docker]
desc: A RESTful e-commerce API with a product catalogue, cart management and order processing, containerised with Docker.
metric: "3"
metricLabel: domains, catalogue to cart to orders
url: https://github.com/starpearl03/bazaar-api
---

## Why

An online store needs more than a product list: customers and sellers need accounts, customers need to browse and filter, and a cart has to turn into an order.

## Approach

The API is built with Java and Spring Boot on MongoDB, around three domains: the product catalogue (products, categories and images), carts, and orders. It follows REST conventions so web and mobile clients can integrate easily, and it ships as a Docker container.
