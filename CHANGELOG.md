# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## 0.0.6 - 2024-01-27
### Changed
- distinguish between normal and index routes.

### Fixed
- index routes being matched wrongly.
- throw with paths with multiple segments

## 0.0.5 - 2024-01-07
### Changed
- distinguish between normal and index routes.

### Fixed
- index routes being matched wrongly.
- throw with paths with multiple segments

## 0.0.5 - 2024-01-07
### Fixed
- exporting `RouterType` as a value instead of a type.

## 0.0.4 - 2024-01-04
### Added
- improved documentation

### Fixed
- restored `Router.getSearchParams`.
- navigating causing `onChanged` hook to be called even when url is unchanged.
- `Router.getParams` now encodes params value before storing them.

## 0.0.3 - 2024-01-02
### Changed
- simplified how the router work.

## 0.0.2 - 2023-12-28
### Added
- `toHref` method allowing the creation of a valid `href` from a path or a `NamedDestination`.

### Fixed
- improved `navigate()` with the existance of a `base`.

## 0.0.1 - 2023-12-08
### Added
- export `RouterInstance` class.
- export `types`.
- export `isUrlNavigatable` method.
