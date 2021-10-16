# Ananos Airdropper

## Requirements
[Node.js](https://nodejs.org/) Current. This was developed and tested only on v16.

[Git](https://git-scm.com/) is the easiest way to clone this project.

## Install

If you don't have git or don't want to install it, look for the `Download ZIP` button.

## Test it out
The `test` directory contains everything necessary to run an airdrop simulation of `DorkBucks` on the Stellar testnet. By default, the test will filter out 9 invalid addresses and send an airdrop of `2 DorkBucks` each to 12 valid addresses. If you want to increase the number of recipients, open the `test/addresses.txt` file and remove the `#` from the commented out public keys.

### Run the test

On your Command Prompt or Terminal app, navigate to the project's root directory and run:

``` sh
npm run test
```

The script will print each step on the console and, once finished, will write reports and error logs to the `test/reports/` and `test/logs` directories. Files in `test/reports` are in csv format and can be imported by a spreadsheet application.

## Run a real airdrop on the Stellar public network

### Configuration

Edit these three files in the root directory:

#### `config.toml`
Open the `config.toml` file in the root directory and fill in the required details.

#### `addresses.txt`
Add each address on its own line. Empty lines and lines beginning with a `#` are ignored. The script can also resolve valid federated addresses.

#### `SECRETKEY`
Paste the distributing account's secret key. Exercise caution with this file, obviously. I couldn't think of an easier, quicker way to sign transactions. Perhaps the next version will have hardware wallet support, assuming it's possible.

### Run the command

On your Command Prompt or Terminal app, navigate to the project's root directory and run:

``` sh
npm start
```

As with the test run, the script will write reports and error logs but will do so in the `reports` and `logs` directories in the project root.
