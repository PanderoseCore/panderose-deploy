// Creates the Azure Static Web App resource for panderose.com (site + docs)
// WITHOUT Azure's built-in GitHub integration — deliberately, so Azure
// doesn't auto-commit a competing workflow file. Deploys are driven by
// .github/workflows/azure-deploy.yml instead, using this resource's
// deployment token as a GitHub secret (see infra/README.md).
//
// Usage: az deployment group create -g <resource-group> \
//          -f infra/static-web-app.bicep -p appName=panderose

@description('Name of the Static Web App resource.')
param appName string = 'panderose'

@description('Azure region. Only affects the (unused) managed Functions backend — pick the closest.')
param location string = 'westus2'

@description('SKU — Free covers a static brochure site + docs comfortably.')
@allowed(['Free', 'Standard'])
param sku string = 'Free'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: appName
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // No repositoryUrl/branch/repositoryToken here on purpose — see the
    // header comment. This resource is deploy-target-only; the GitHub
    // Actions workflow in this repo (azure-deploy.yml) pushes to it using
    // the deployment token below.
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
  }
}

output defaultHostname string = staticWebApp.properties.defaultHostname
output resourceId string = staticWebApp.id
