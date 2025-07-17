# vanity-market

## Setting up the dev env

For yagna setup see [sandbox/README.md]

### CLI

see [cli/README.md]

### SaaS

see [app/]

### Common tools

- .tools:

  ```bash
  export PATH=$PATH:$(pwd)/.tools
  do-pr-review.sh 62
  ```

- license finder (https://github.com/pivotal/LicenseFinder/blob/master/dlf):

  ```bash
  wget https://raw.githubusercontent.com/pivotal/LicenseFinder/refs/heads/master/dlf
  chmod +x dlf
  cd cli;
  npm run install
  ../dlf "license_finder"
  ```

## Product/Project Managment

- Weekly updates: [z_projectmanagement](z_projectmanagement/)
- Tools:
  - claude command for weekly updates: .claude/commands/week-summary.md
  - scripts to reuse: z_projectmanagement/gdocs and z_projectmanagement/gsheets

## Marketing and external communication

- Open Source repos:
  - https://github.com/golem-vanity-market/golem-vanity-market-cli

- Marketing:
  - [Partner Milestone Update Template](https://docs.google.com/spreadsheets/d/17fCYSfB2YYfw551NHpv_-iLJ6RAIlt6zgJ4bxq7hzcg/edit?gid=2073108981#gid=2073108981&range=1:1)

## References

- [vanity.market Plan](https://docs.google.com/spreadsheets/d/13PALoUwM0zfAaME66HackqH3LiffFHjEpYCIafYGnVo/edit?gid=1248582987#gid=1248582987&range=A12:A23)
- [vanity.market Design Doc](https://docs.google.com/document/d/1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg/edit?tab=t.0#heading=h.mrakbabhnmym)
- [vanity.market Product Spec](https://docs.google.com/document/d/10MnCkt5k9sX0xF7sOUCUnMFIOLZIuS_L_G3xe9k4ZXI/edit?tab=t.0#heading=h.k9gvamsqfnm6)
