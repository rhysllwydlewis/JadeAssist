name: Build JadeAssist Widget

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install
        working-directory: packages/widget

      - name: Build widget
        run: npm run build
        working-directory: packages/widget

      - name: Commit built widget
        run: |
          git config --global user.name "github-actions"
          git config --global user.email "github-actions@github.com"
          git add packages/widget/dist
          git commit -m "Auto-build widget"
          git push
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
