# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.7] - 2025-08-08

### Added
- Individual unit specification for `fluid()` function
  - Support specifying unit as last argument: `fluid(16px, 24px, vw)`
  - Support unit with viewport specification: `fluid(16px, 24px, 320px, 1280px, cqi)`
  - Works with custom properties: `fluid(var(--min), var(--max), vw)`
  - Unit priority: individual > global option > default (vi)
- Comprehensive test cases for individual unit specification
- Updated README with examples and documentation for new feature

### Fixed
- Fixed typos in variable names (`valiable` → `variable`, `isFormulaOuput` → `isFormulaOutput`)

## [0.0.6] - Previous release

### Added
- Unit option support for global configuration
- Support for `vi`, `vw`, `cqw`, `cqi` units
- Custom property support

## [Earlier versions]

See git history for earlier changes.