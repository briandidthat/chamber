# chamber
Command line interface to manage and swap ERC20 tokens

### How to see all current config variables
```sh
chamber config show
```

### How to add config variables to cli
```sh
chamber config set -k ${KEY} -v ${VALUE}
```

### How to fetch a quote for a swap (ex: 100 eth to dai)
```sh 
chamber swap quote -s ETH -b DAI -a 100
```

### How to execute a swap (ex: 100 eth to dai)
```sh
chamber swap execute -s ETH -b DAI -a 100
```


