import React from 'react';
import Content from "../components/Content/Content";
import { ContextData, IContextData } from './../components/Context';
import api from './../api/api';
import * as I from './../api/interfaces';
import config from './../api/config';
import { socket } from './../components/Content/Tabs/Live/Live';
import LoginRegisterModal from './LoginRegisterModal';
import ElectronOnly from './../components/ElectronOnly';


declare let window: any;
const isElectron = config.isElectron;
const fakeRequire = () => ({remote:null});
if(!isElectron){
    window.require = fakeRequire;
}
const { remote } = window.require("electron");

interface IProps {};
interface IState {
    data: IContextData;
    loading: boolean,
    loadingLogin: boolean,
    loginError: string
}
export default class Layout extends React.Component<IProps, IState> {
    constructor(props: IProps){
        super(props);
        this.state = {
            data:{
                teams: [],
                players: [],
                matches: [],
                reload: async () => new Promise(async (res, rej) => {
                     await this.loadPlayers();
                     await this.loadTeams();
                     await this.loadMatch();
                     res();
                })
            },
            loginError: '',
            loadingLogin: false,
            loading: true
        }
    }
    componentDidMount(){
        //const socket = io.connect(`${config.isDev ? config.apiAddress : '/'}`);
        this.loadUser();
        socket.on('match', (fromVeto?: boolean) => {
            if(fromVeto) this.loadMatch();
        });
        socket.on('devHUD', (status: boolean) => {console.log(status)})
    }
    loadUser = async () => {

        try{
            const appLoadedUser = await api.user.getCurrent();
            if(appLoadedUser){
                this.setUser(appLoadedUser);
                return this.setState({loading:false})
            }
            
			const machine = await api.machine.get();

            const user = await api.user.get(machine.id);
            if(!user) return this.setState({loading: false}, () => this.setUser());

            if("error" in user){
                return this.setState({loading: false, loginError: user.error}, () => this.setUser());
            }

            const userData = await api.user.verify(user.token);
            if(!userData) return this.setState({loading: false, loginError: "It seems that your session has expired - please restart & login again"}, () => this.setUser());
            this.setUser(userData);
            this.setState({loading: false});
        } catch {
            
            return this.setState({loading: false});
        }
    }
    setUser = (user?: I.Customer) => {
        const { data } = this.state;
        data.customer = user;
        this.setState({data});
    }
    loadTeams = async () => {
        const teams = await api.teams.get();
        const { data } = this.state;
        data.teams = teams;
        if(teams){
            this.setState({data});
        }
    }
    loadPlayers = async () => {
        const players = await api.players.get();
        const { data } = this.state;
        data.players = players;
        if(players){
            this.setState({data});
        }
    }
    loadMatch = async () => {
        const matches = await api.match.get();
        const { data } = this.state;
        data.matches = matches;
        if(matches){
            this.setState({data});
        }
    }
    minimize = () => {
        if(!remote) return;
        remote.getCurrentWindow().minimize();
    }
    maximize = () => {
        if(!remote) return;
        if(remote.getCurrentWindow().isMaximized()){
            remote.getCurrentWindow().restore();
        } else {
            remote.getCurrentWindow().maximize();
        }
    }
    logout = async () => {
        await api.user.logout();
        this.loadUser();
    }
    close = () => {
        if(!remote) return;
        remote.getCurrentWindow().close();
    }
    setLoading = (loading: boolean, loginError?: string) => {
        this.setState({loadingLogin: loading, loginError: loginError || ''});
    }
    render() {
        const { Provider } = ContextData;
        const { loading, data, loadingLogin, loginError } = this.state;
        return (
            <Provider value={this.state.data}>
                <div className={`loaded ${isElectron ? 'electron' : ''}`}>
                    <div className="window-bar">
                        <div className="window-drag-bar"></div>
                        <div onClick={this.minimize} className="app-control minimize"></div>
                        <div onClick={this.maximize} className="app-control maximize"></div>
                        <div onClick={this.close} className="app-control close"></div>
                    </div>
                    {data.customer ? <div className={`license-status ${isElectron ? 'electron' : ''}`}>
                        {data.customer.license.type}
                        <ElectronOnly><div className="logout-button" onClick={this.logout}>Logout</div></ElectronOnly>
                    </div>:null}
                    {<div className={`loading-container ${loading ? '' :'hide'}`} >Loading...</div>}
                    <LoginRegisterModal isOpen={!data.customer} loading={loadingLogin} setLoading={this.setLoading} setUser={this.setUser} error={loginError}/>
                    <Content/>
                </div>
            </Provider>
        )
    }
}
