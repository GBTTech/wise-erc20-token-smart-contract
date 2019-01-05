export default function ether(v){
    return new web3.BigNumber(web3.toWei(v, 'ether'))
}